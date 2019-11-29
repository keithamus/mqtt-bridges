import EventIterator from "event-iterator";
import {Service} from "./service";

export abstract class Device<C> {
  public abstract name: string;
  constructor(public config: C, public service: Service<Device<C>>) {}
  abstract start(): Promise<void>
  abstract stop(): Promise<void>

  protected emit(topic: string, payload: string | Buffer) {
    // noop
  }

  command(topic: string, payload: string | Buffer) {
    
  }

  [Symbol.asyncIterator](): AsyncIterator<[topic: string, payload: string | Buffer], void, void> {
    const iter = new EventIterator<[topic: string, payload: string | Buffer]>(({push}) => {
      this.emit = (topic: string, payload: string | Buffer) => {
        push([topic, payload])
      }
    })
    return iter[Symbol.asyncIterator]()
  }
}
