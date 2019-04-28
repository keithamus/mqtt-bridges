import mqtt from 'mqtt-bridge-utils'
import {readFile, writeFile} from 'fs'
import {promisify} from 'util'
const readFileAsync = promisify(readFile)
const writeFileAsync = promisify(writeFile)
const reorder = (xs, x) => {
  const i = xs.indexOf(x)
  return xs.slice(i).concat(xs.slice(0, i))
}

const main = async (config) => {
  const {SCENE_FILE} = config
  const scenes = JSON.parse(await readFileAsync(SCENE_FILE))
  const mqpub = await mqtt(config, async (scene, command, payload) => {
    if (!(scene in scenes)) return
    let mode = ''
    switch(command) {
      case 'set':
        if (Array.isArray(scenes[scene]) && !scenes[scene].includes(payload)) return
        mode = payload
        break;
      case 'cycle':
        if (!Array.isArray(scenes[scene])) return
        mode = scenes[scene][1]
        break;
      default:
        return
    }
    scenes[scene] = reorder([mode].concat(scenes[scene]))
    await writeFileAsync(SCENE_FILE, JSON.stringify(scenes, null, 2))
    mqpub(scene, mode)
  })
  for (const [scene, allowed] of Object.entries(scenes)) {
    mqpub(scene, Array.isArray(allowed) ? allowed[0] : allowed)
  }
}

main(Object.assign({ MQTT_ROOT: 'scenes' }, process.env)).catch(e => {
  console.error(e.stack || e)
  process.exit(1)
})
