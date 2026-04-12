declare module 'dotenv/config'

declare module 'zod' {
  export const z: any
}

declare module 'axios' {
  const axios: any
  export default axios
}

declare module 'axios-cookiejar-support' {
  export const wrapper: (value: any) => any
}

declare module 'tough-cookie' {
  export class CookieJar {
    setCookie(cookie: string, url: string): Promise<void>
    getCookieString(url: string): Promise<string>
  }

  export function parse(cookieStr: string, options?: { loose?: boolean }): any
}