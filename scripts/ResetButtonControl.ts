import { _decorator, Button, Component, Node } from "cc";
import { ContentControlDictation } from "./ContentControlDictation";
const { ccclass, property } = _decorator;

@ccclass("ResetButtonControl")
export class ResetButtonControl extends Component {
  start() {
    this.node.on(Button.EventType.CLICK, this.callback, this);
  }
  callback(button: Button) {
    this.node.parent.getChildByName("Content").getComponent(ContentControlDictation)?.reset();
  }

  update(deltaTime: number) {}
}
