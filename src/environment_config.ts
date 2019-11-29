export function extractConfigFromEnvironment(env: {[key: string]: string | undefined}, config: any) {
  for (const key in env) {
    if (!key.startsWith('MB_')) continue
    let node = config
    for (let i = 1, parts = key.split('_'); i < parts.length; i += 1) {
      const part = parts[i].toLowerCase()
      if (part === 'prototype' || part === '__proto__') break
      node[part] = node[part] || {}
      if (i === parts.length - 1) {
        node[part] = env[key]
      } else {
        node = node[part]
      }
    }
  }
  return config
}
