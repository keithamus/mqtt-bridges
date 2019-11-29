import {Platform} from './platform';
import {writeFileSync, promises as fsPromised} from 'fs';
import {extractConfigFromEnvironment} from './environment_config';
const {readFile} = fsPromised
async function cli(): Promise<number> {
  console.log('Reading configuration')
  let config = JSON.parse((await readFile("./config.json")).toString())
  if (config.env === true) {
    config = extractConfigFromEnvironment(process.env, config)
  }
  console.log('Booting platform...')
  const platform = new Platform(config);
  if (config.rewrite) {
    platform.onDevice = function () {
      writeFileSync('./config.json', JSON.stringify(platform.generateConfig(), null, 2))
    }
  }
  const reason = await Promise.race([
    platform.start().then(() => 'ABRUPT'),
    new Promise(resolve => process.on('SIGINT', resolve)).then(() => 'SIGINT'),
    new Promise(resolve => process.on('SIGTERM', resolve)).then(() => 'SIGTERM'),
  ])
  console.log(`Shutting down (${reason})`)
  await Promise.race([
    new Promise(resolve => setTimeout(resolve, 5000)),
    await platform.stop()
  ])
  return (reason === 'SIGINT' ? 130 : reason === 'SIGTERM' ? 143 : 0)
}

cli().then(process.exit, (error) => {
  console.error(error)
  process.exit(1)
})

