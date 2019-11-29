import {Device} from './device'
export abstract class Service<D extends Device<any>> {
  public abstract name: string;
  devices: D[] = [];
  async * discover(): AsyncGenerator<D, void, void> {}

  getDevice(name: string): D | void {
    return this.devices.find(device => device.name === name)
  }
}
