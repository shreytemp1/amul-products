#!/usr/bin/env python3
"""
Amul API - GitHub Gist Automation Version

This is a modified version optimized for:
- GitHub Actions automated runs
- Batch multi-pincode processing
- JSON output for Gist storage
- No user interaction required
- Automatic result uploads

Usage:
  # Single pincode
  python3 amul_api_gist.py --pincode 412101 --output results.json

  # Multiple pincodes
  python3 amul_api_gist.py --pincodes 412101,400001,560001 --output results.json

  # Verbose mode for debugging
  python3 amul_api_gist.py --pincodes 412101,400001 --output results.json --verbose

  # GitHub Actions (auto-detect environment)
  GITHUB_TOKEN=$TOKEN GIST_ID=abc123... python3 amul_api_gist.py --auto-push

Output: results.json with all product data in JSON format
"""
import hashlib
import json
import logging
import os
import re
import secrets
import sys
import time
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional
from datetime import datetime

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# ============================================================================
# SETUP LOGGING
# ============================================================================

LOG_FILE = os.getenv("LOG_FILE", "/tmp/amul_gist.log")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# ============================================================================
# CONSTANTS
# ============================================================================

AMUL_STORE_ID = "62fa94df8c13af2e242eba16"
AMUL_BROWSE_URL = "https://shop.amul.com/en/browse/protein"
AMUL_USER_INFO_URL = "https://shop.amul.com/user/info.js"
AMUL_PINCODE_URL = "https://shop.amul.com/entity/pincode"
AMUL_PRODUCTS_URL = "https://shop.amul.com/api/1/entity/ms.products"

DEFAULT_PINCODES = os.getenv("AMUL_PINCODES", "412101,400001,560001").split(",")

DEFAULT_HEADERS = {
    "accept": "application/json, text/plain, */*",
    "accept-language": "en-US,en;q=0.9",
    "cache-control": "no-cache",
    "frontend": "1",
    "pragma": "no-cache",
    "priority": "u=1, i",
    "referer": "https://shop.amul.com/",
    "sec-ch-ua": '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Linux"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "sec-gpc": "1",
    "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"
}

SUBSTORE_MAP: Dict[str, str] = {
    "goa": "66506005147d6c73c1110115",
    "telangana": "66506004aa64743ceefbed25",
    "pune-br": "66506004a7cddee1b8adb014",
    "solapur-br": "66506004145c16635e6cc914",
    "nashik-br": "66506002c8f2d6e221b91988",
    "aurangabad-br": "66506002aa64743ceefbecf1",
    "chhattisgarh": "66506002998183e1b1935f41",
    "mumbai-br": "66506000c8f2d6e221b9193a",
    "dadra-and-nagar-haveli": "6650600062e3d963520d0bc3",
    "west-bengal": "6650600024e61363e088c526",
    "odisha": "66505ffeaf6a3c7411d2f62c",
    "sikkim": "66505ffe91ab653d60a3df2d",
    "tripura": "66505ffe78117873bb53b6ad",
    "mizoram": "66505ffd998183e1b1935e21",
    "meghalaya": "66505ffd672747740fb389c7",
    "nagaland": "66505ffd24e61363e088c4a5",
    "manipur": "66505ffbf40e263cf5588098",
    "jharkhand": "66505ffb998183e1b1935dee",
    "assam": "66505ffb6510ee3d5903fef8",
    "bihar": "66505ff9af6a3c7411d2f55f",
    "arunachal-pradesh": "66505ff978117873bb53b643",
    "uttar-pradesh-e": "66505ff924e61363e088c414",
    "up-ncr": "66505ff8c8f2d6e221b9180c",
    "uttrakhand": "66505ff8a7cddee1b8adae9d",
    "rajasthan": "66505ff824e61363e088c3dd",
    "jandk": "66505ff6f40e263cf5587fb5",
    "madhya-pradesh": "66505ff6d9346de216752cd7",
    "ladakh": "66505ff6145c16635e6cc7c1",
    "haryana": "66505ff5af6a3c7411d2f4b2",
    "tamil-nadu-1": "66505ff578117873bb53b56a",
    "delhi": "66505ff5145c16635e6cc74d",
    "punjab": "66505ff3998183e1b1935d0e",
    "andhra-pradesh": "66505ff378117873bb53b542",
    "pondicherry": "66505ff312a50963f24870e8",
    "kerala": "66505ff2998183e1b1935ccd",
    "himachal-pradesh": "66505ff26510ee3d5903fda9",
    "chandigarh": "66505ff1672747740fb388ec",
    "karnataka": "66505ff0998183e1b1935c75",
    "gujarat": "66505ff06510ee3d5903fd42",
    "daman-and-diu": "66505ff024e61363e088c306",
}

# ============================================================================
# DATA MODELS
# ============================================================================

@dataclass(frozen=True)
class Product:
    name: str
    sku: str
    alias: str
    price: Optional[float]
    available: Optional[int]
    inventory_quantity: Optional[int]
    low_stock_quantity: Optional[int]
    allow_out_of_stock: Optional[str]
    
    @classmethod
    def from_api(cls, raw: dict) -> 'Product':
        return cls(
            name=raw.get("name", ""),
            sku=raw.get("sku", ""),
            alias=raw.get("alias", ""),
            price=raw.get("price"),
            available=raw.get("available"),
            inventory_quantity=raw.get("inventory_quantity"),
            low_stock_quantity=raw.get("inventory_low_stock_quantity"),
            allow_out_of_stock=raw.get("inventory_allow_out_of_stock")
        )
    
    def is_in_stock(self) -> bool:
        if self.allow_out_of_stock != "0":
            return True
        return (self.available or 0) > 0 and (
            self.inventory_quantity or 0
        ) >= (self.low_stock_quantity or 0)
    
    def availability_left(self) -> int:
        return self.available or 0
    
    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "sku": self.sku,
            "alias": self.alias,
            "price": self.price,
            "available": self.available,
            "inventory_quantity": self.inventory_quantity,
            "low_stock_quantity": self.low_stock_quantity,
            "allow_out_of_stock": self.allow_out_of_stock,
            "in_stock": self.is_in_stock(),
            "availability_left": self.availability_left()
        }

# ============================================================================
# AMUL API - MAIN CLASS (SAME AS PRODUCTION)
# ============================================================================

class AmulApi:
    def __init__(self):
        self.session = requests.Session()
        retry = Retry(
            total=3,
            backoff_factor=1,
            allowed_methods=["GET", "POST"],
            status_forcelist=[500, 502, 503, 504]
        )
        adapter = HTTPAdapter(max_retries=retry)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
        self.session.headers.update(DEFAULT_HEADERS)
        
        self.tid: Optional[str] = None
        self.substore_id: Optional[str] = None
        self.substore_name: Optional[str] = None
        self.pincode: Optional[str] = None
        self.initialized_at = time.time()
    
    def init_cookies(self) -> bool:
        try:
            logger.info("📥 [Step 1] Initializing cookies...")
            r = self.session.get(AMUL_BROWSE_URL, timeout=20)
            r.raise_for_status()
            logger.info(f"✅ [Step 1] Got {len(self.session.cookies)} cookies")
            return True
        except Exception as e:
            logger.error(f"❌ [Step 1] Failed: {e}")
            return False
    
    def _calculate_tid_header(self, session_id: str) -> str:
        timestamp = str(int(time.time() * 1000))
        random_value = str(secrets.randbelow(1000))
        payload = f"{AMUL_STORE_ID}:{timestamp}:{random_value}:{session_id}"
        payload_hash = hashlib.sha256(payload.encode()).hexdigest()
        return f"{timestamp}:{random_value}:{payload_hash}"
    
    def extract_session_tid(self) -> bool:
        try:
            logger.info("🔐 [Step 2] Extracting session TID...")
            initial_tid = self._calculate_tid_header("undefined")
            url = f"{AMUL_USER_INFO_URL}?_v={int(time.time() * 1000)}"
            r = self.session.get(url, headers={"tid": initial_tid}, timeout=20)
            r.raise_for_status()
            text = r.text.strip()
            if text.startswith("session = "):
                text = text.replace("session = ", "", 1)
            session_data = json.loads(text)
            self.tid = session_data.get("tid")
            if not self.tid:
                logger.error("❌ [Step 2] No TID in response")
                return False
            logger.info(f"✅ [Step 2] Got TID: {self.tid}")
            return True
        except Exception as e:
            logger.error(f"❌ [Step 2] Failed: {e}")
            return False
    
    def search_pincode(self, pincode: str) -> bool:
        try:
            logger.info(f"📍 [Step 3] Searching pincode {pincode}...")
            url = (
                f"{AMUL_PINCODE_URL}?limit=50"
                f"&filters[0][field]=pincode"
                f"&filters[0][value]={pincode}"
                f"&filters[0][operator]=regex"
                f"&cf_cache=1h"
            )
            fresh_tid = self._calculate_tid_header(self.tid)
            r = self.session.get(url, headers={"tid": fresh_tid}, timeout=20)
            r.raise_for_status()
            records = r.json().get("records", [])
            if not records:
                logger.error(f"❌ [Step 3] No records for {pincode}")
                return False
            self.substore_name = records[0].get("substore")
            if not self.substore_name:
                logger.error("❌ [Step 3] No substore in record")
                return False
            self.substore_id = SUBSTORE_MAP.get(self.substore_name)
            if not self.substore_id:
                logger.error(f"❌ [Step 3] Unknown substore: {self.substore_name}")
                return False
            self.pincode = pincode
            logger.info(f"✅ [Step 3] Substore: {self.substore_name} → {self.substore_id}")
            return True
        except Exception as e:
            logger.error(f"❌ [Step 3] Failed: {e}")
            return False
    
    def get_protein_products(self, limit: int = 32, start: int = 0) -> List[Product]:
        if not self.tid or not self.substore_id:
            logger.error("❌ Session not initialized")
            return []
        
        try:
            params = {
                "fields[name]": "1",
                "fields[brand]": "1",
                "fields[categories]": "1",
                "fields[collections]": "1",
                "fields[alias]": "1",
                "fields[sku]": "1",
                "fields[price]": "1",
                "fields[compare_price]": "1",
                "fields[original_price]": "1",
                "fields[images]": "1",
                "fields[metafields]": "1",
                "fields[discounts]": "1",
                "fields[catalog_only]": "1",
                "fields[is_catalog]": "1",
                "fields[seller]": "1",
                "fields[available]": "1",
                "fields[inventory_quantity]": "1",
                "fields[net_quantity]": "1",
                "fields[num_reviews]": "1",
                "fields[avg_rating]": "1",
                "fields[inventory_low_stock_quantity]": "1",
                "fields[inventory_allow_out_of_stock]": "1",
                "fields[default_variant]": "1",
                "fields[variants]": "1",
                "fields[lp_seller_ids]": "1",
                "filters[0][field]": "categories",
                "filters[0][value][0]": "protein",
                "filters[0][operator]": "in",
                "filters[0][original]": "1",
                "facets": "true",
                "facetgroup": "default_category_facet",
                "limit": str(limit),
                "total": "1",
                "start": str(start),
                "substore": self.substore_id
            }
            
            fresh_tid = self._calculate_tid_header(self.tid)
            r = self.session.get(
                AMUL_PRODUCTS_URL,
                params=params,
                headers={"tid": fresh_tid},
                timeout=20
            )
            r.raise_for_status()
            
            data = r.json()
            products_data = data.get("data", [])
            paging = data.get("paging", {})
            
            logger.info(
                f"✅ Fetched {len(products_data)} products "
                f"(total={paging.get('total')}, count={paging.get('count')})"
            )
            
            products = []
            for raw in products_data:
                try:
                    p = Product.from_api(raw)
                    products.append(p)
                except Exception as e:
                    logger.warning(f"Failed to parse product: {e}")
            
            return products
        
        except Exception as e:
            logger.error(f"❌ Failed to fetch products: {e}")
            return []
    
    def initialize(self, pincode: str) -> bool:
        logger.info(f"\n🔄 === INITIALIZING FOR {pincode} ===")
        if not self.init_cookies():
            return False
        if not self.extract_session_tid():
            return False
        if not self.search_pincode(pincode):
            return False
        logger.info(f"✅ === READY FOR {pincode} ===\n")
        return True
    
    def get_session_info(self) -> Dict:
        return {
            "pincode": self.pincode,
            "substore": self.substore_name,
            "substore_id": self.substore_id,
            "tid": self.tid
        }

# ============================================================================
# BATCH PROCESSOR
# ============================================================================

class BatchProcessor:
    """Process multiple pincodes and save to JSON"""
    
    def __init__(self):
        self.results = []
        self.errors = []
        self.start_time = time.time()
    
    def process(self, pincodes: List[str]) -> Dict:
        """Process all pincodes and return results"""
        logger.info(f"\n📊 === BATCH PROCESSING {len(pincodes)} PINCODES ===")
        
        for i, pincode in enumerate(pincodes, 1):
            logger.info(f"\n📌 [{i}/{len(pincodes)}] Processing {pincode}...")
            
            try:
                api = AmulApi()
                if not api.initialize(pincode):
                    self.errors.append({
                        "pincode": pincode,
                        "error": "Initialization failed",
                        "timestamp": datetime.now().isoformat()
                    })
                    continue
                
                products = api.get_protein_products(limit=32)
                
                result = {
                    "pincode": pincode,
                    "substore": api.substore_name,
                    "substore_id": api.substore_id,
                    "status": "success",
                    "product_count": len(products),
                    "products": [p.to_dict() for p in products],
                    "summary": {
                        "total": len(products),
                        "in_stock": sum(1 for p in products if p.is_in_stock()),
                        "out_of_stock": sum(1 for p in products if not p.is_in_stock())
                    },
                    "timestamp": datetime.now().isoformat()
                }
                
                self.results.append(result)
                
                logger.info(
                    f"✅ {pincode}: "
                    f"{result['summary']['total']} products, "
                    f"{result['summary']['in_stock']} in stock"
                )
            
            except Exception as e:
                logger.error(f"❌ {pincode}: {e}")
                self.errors.append({
                    "pincode": pincode,
                    "error": str(e),
                    "timestamp": datetime.now().isoformat()
                })
        
        elapsed = time.time() - self.start_time
        
        output = {
            "metadata": {
                "generated_at": datetime.now().isoformat(),
                "execution_time_seconds": round(elapsed, 2),
                "pincodes_requested": len(pincodes),
                "pincodes_success": len(self.results),
                "pincodes_failed": len(self.errors),
                "total_products": sum(r["product_count"] for r in self.results),
                "total_in_stock": sum(r["summary"]["in_stock"] for r in self.results),
                "total_out_of_stock": sum(r["summary"]["out_of_stock"] for r in self.results),
            },
            "results": self.results,
            "errors": self.errors
        }
        
        logger.info(f"\n📊 === BATCH COMPLETE ===")
        logger.info(f"✅ Success: {len(self.results)}/{len(pincodes)}")
        logger.info(f"❌ Failed: {len(self.errors)}/{len(pincodes)}")
        logger.info(f"⏱️  Time: {elapsed:.2f}s")
        logger.info(f"📦 Total products: {output['metadata']['total_products']}")
        
        return output

# ============================================================================
# GITHUB GIST UPLOADER
# ============================================================================

class GistUploader:
    """Upload results to GitHub Gist"""
    
    def __init__(self, token: str, gist_id: str):
        self.token = token
        self.gist_id = gist_id
        self.api_url = f"https://api.github.com/gists/{gist_id}"
    
    def upload(self, filename: str, content: str) -> bool:
        """Upload/update file in Gist"""
        try:
            logger.info(f"📤 Uploading to Gist: {filename}")
            
            payload = {
                "files": {
                    filename: {
                        "content": content
                    }
                }
            }
            
            headers = {
                "Authorization": f"token {self.token}",
                "Accept": "application/vnd.github.v3+json"
            }
            
            r = requests.patch(
                self.api_url,
                json=payload,
                headers=headers,
                timeout=10
            )
            
            if r.status_code != 200:
                logger.error(f"❌ Gist upload failed: {r.status_code} {r.text}")
                return False
            
            gist_url = r.json()["html_url"]
            logger.info(f"✅ Uploaded to: {gist_url}")
            return True
        
        except Exception as e:
            logger.error(f"❌ Gist upload error: {e}")
            return False

# ============================================================================
# MAIN
# ============================================================================

def main():
    parser = __import__('argparse').ArgumentParser(
        description="Amul API - GitHub Gist Automation"
    )
    
    parser.add_argument(
        "--pincode",
        help="Single pincode (alternative to --pincodes)"
    )
    parser.add_argument(
        "--pincodes",
        help="Comma-separated pincodes (e.g., 412101,400001,560001)"
    )
    parser.add_argument(
        "--output",
        default="amul_results.json",
        help="Output JSON file"
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Verbose logging"
    )
    parser.add_argument(
        "--auto-push",
        action="store_true",
        help="Auto-push to Gist (requires GITHUB_TOKEN and GIST_ID)"
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=32,
        help="Products per page"
    )
    
    args = parser.parse_args()
    
    if args.verbose:
        logger.setLevel(logging.DEBUG)
    
    # Determine pincodes
    if args.pincode:
        pincodes = [args.pincode]
    elif args.pincodes:
        pincodes = [p.strip() for p in args.pincodes.split(",")]
    else:
        pincodes = DEFAULT_PINCODES
    
    # Process
    processor = BatchProcessor()
    results = processor.process(pincodes)
    
    # Save to file
    logger.info(f"💾 Saving to {args.output}")
    with open(args.output, "w") as f:
        json.dump(results, f, indent=2)
    logger.info(f"✅ Saved!")
    
    # Auto-push to Gist if requested
    if args.auto_push:
        token = os.getenv("GITHUB_TOKEN")
        gist_id = os.getenv("GIST_ID")
        
        if not token or not gist_id:
            logger.error(
                "❌ --auto-push requires GITHUB_TOKEN and GIST_ID env vars"
            )
            sys.exit(1)
        
        uploader = GistUploader(token, gist_id)
        with open(args.output, "r") as f:
            content = f.read()
        
        if not uploader.upload(args.output, content):
            sys.exit(1)
    
    logger.info("\n✅ DONE!")
    return 0

if __name__ == "__main__":
    sys.exit(main())
