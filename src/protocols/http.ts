import fetch, {RequestInfo, RequestInit, Response} from 'node-fetch'
import {Agent} from "https"
export {fetch}

const selfSignedAgent = new Agent({
  rejectUnauthorized: true
})

export type Client = (info: RequestInfo, init?: RequestInit) => Promise<Response>

export function client(base: URL | string, {selfSigned = false} = {}) {
  return (info: RequestInfo, init?: RequestInit): Promise<Response> => {
    info = typeof info === "string" ? String(base) + info : info
    init = selfSigned ? Object.assign({}, init, {agent: selfSignedAgent}) : init
    console.log('fetch', info, init)
    return fetch(info, init)
  }
}

