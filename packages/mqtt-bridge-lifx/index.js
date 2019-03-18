import mqtt from 'mqtt-bridge-utils'
import lifx from 'node-lifx'
import pify from 'pify'
import delay from 'delay'
import forever from 'p-forever'

const commands = {
  on: d => [Number(d) || 0],
  off: d => [Number(d) || 0],
  color: ([h,s,b,k,d]) => [Number(h) || 0, Number(s) || 0, Number(b) || 0, Number(k) || 0, Number(d) || 0],
  colorRgb: ([r,g,b,d]) => [Number(r) || 0, Number(g) || 0, Number(b) || 0, Number(d) || 0],
  colorRgbHex: (args) => Array.isArray(args) ? [String(args[0]), Number(args[1]) || 0] : [String(args), 0],
  maxIR: d => [Number(d) || 0],
  setLabel: label => [String(label)],
}

const main = async (config) => {
  const {POLL_INTERVAL = 5} = config
  const client = new lifx.Client()
  const lights = new Map()
  const refresh = async () => {
    for (const [id, light] of lights) {
      mqpub(id, Object.assign({ id }, await light.getState(), await light.getHardwareVersion(), await light.getFirmwareVersion()))
    }
    await delay(POLL_INTERVAL * 1000)
  }
  const mqpub = await mqtt(config, async (id, command, payload) => {
    console.log(id, command, payload)
    let light = client.light(id)
    if (!light) return
    if (!light[command]) return
    light = pify(light)
    if (command.startsWith('get')) return
    const args = commands[command] ? commands[command](payload) : [] 
    console.log('issuing command', command, ...args)
    try {
      await light[command](...args)
    } catch (e) {
      console.error(e)
    }
    await refresh()
  })
  client.on('light-new', async light => {
    lights.set(light.id, pify(light))
  })
  client.init()
  client.on('error', err => {
    console.error(err)
    process.exit(1)
  })
  return forever(refresh)
}

main(Object.assign({ MQTT_ROOT: 'lifx' }, process.env)).catch(e => {
  console.error(e.stack || e)
  process.exit(1)
})
