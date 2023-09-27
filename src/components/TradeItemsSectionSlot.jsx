import React from "react";
import PropTypes from "prop-types";
import ShinyEffect from "./ShinyEffect.jsx";
import * as _ from "underscore";
import Utils from "../classes/Utils";
import StickerStack from "./StickerStack.jsx";

export default class TradeItemsSectionSlot extends React.Component {

  static propTypes = {
    item: PropTypes.object,
    idx: PropTypes.number,
    onRemoveItem: PropTypes.func,
  };

  constructor(props) {
    super(props);
    this.spawnDelay = props.idx;
    this.onClick = this.onClick.bind(this);
  }

  onClick() {
    this.props.onRemoveItem(this.props.item);
  }

  render() {
    const {item} = this.props;
    if (!item){
      return (<div className="inventory-slot-small-background"/>);
    }

    return (
      <div className="inventory-slot-small inventory-slot-spawn" style={{"--slot-spawn-delay": ((0.1 * this.spawnDelay) + 's')}}
           onClick={this.onClick}>
        <div ref={(ref)=> this.slot_inner = ref}
             className={"inventory-slot-inner"}>
          <div className="inventory-slot-front" style={{backgroundColor: Utils.getItemRarityColor(item.rarity)}}>
            <StickerStack amount={item.amount} image={Utils.getItemImage(item.itemUid)}/>
            <div className="inventory-slot-name">{item.name}</div>
            <div className="inventory-slot-amount">{'x' + item.amount}</div>
            <div className="inventory-slot-level">{Utils.getItemRarityCode(item.rarity)}</div>
            {
              (item.shiny) ?
                <div>
                  <ShinyEffect/>
                  <ShinyEffect/>
                  <ShinyEffect/>
                </div> : null
            }
          </div>
        </div>
      </div>
    );
  }
}