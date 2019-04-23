import mqtt from 'mqtt-bridge-utils'
import {readFile} from 'fs'
import {promisify} from 'util'
const readFileAsync = promisify(readFile)

const main = async (config) => {
  const {SCENE_FILE} = config
  const scenes = JSON.parse(await readFileAsync(SCENE_FILE))
  const mqpub = await mqtt(config, async (scene, command, payload) => {
    if (command != 'set') return
    if (!(scene in scenes)) return
    if (Array.isArray(scenes[scene]) && !scenes[scene].includes(payload)) return
    mqpub(scene, payload)
  })
  for (const [scene, allowed] of Object.entries(scenes)) {
    mqpub(scene, Array.isArray(allowed) ? allowed[0] : allowed)
  }
}

main(Object.assign({ MQTT_ROOT: 'scenes' }, process.env)).catch(e => {
  console.error(e.stack || e)
  process.exit(1)
})
