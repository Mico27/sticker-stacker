import React from "react";
import PropTypes from "prop-types";
import ShinyEffect from "./ShinyEffect.jsx";
import * as _ from "underscore";
import Utils from "../classes/Utils";
import StickerStack from "./StickerStack.jsx";

export default class InventorySlot extends React.Component {

  static propTypes = {
    item: PropTypes.object,
    idx: PropTypes.number,
  };

  constructor(props) {
    super(props);
    this.state = {
      detailsOpen: false,
    }
    this.spawnDelay = props.idx;
    this.onClick = this.onClick.bind(this);
    this.onMouseLeave = this.onMouseLeave.bind(this);
  }

  onClick() {
    this.setState({
      detailsOpen: !this.state.detailsOpen,
    });
  }

  onMouseLeave() {
    this.setState({
      detailsOpen: false,
    });
  }

  render() {
    const {item} = this.props;
    if (!item){
      return null;
    }
    const {detailsOpen} = this.state;
    const itemImage = Utils.getItemImage(item.itemUid);
    return (
      <div className="inventory-slot inventory-slot-spawn" style={{"--slot-spawn-delay": ((0.1 * this.spawnDelay) + 's')}}
           onClick={this.onClick} onMouseLeave={this.onMouseLeave}>
        <div ref={(ref)=> this.slot_inner = ref}
             className={"inventory-slot-inner"}
             style={{transform: ((detailsOpen)?'rotateY(180deg)':undefined)}}>
          <div className="inventory-slot-front" style={{backgroundColor: Utils.getItemRarityColor(item.rarity)}}>
            <StickerStack amount={item.amount} image={itemImage}/>
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
          <div className="inventory-slot-back" style={{backgroundColor: Utils.getItemRarityColor(item.rarity)}}>
            <div className="inventory-slot-score">{'Score: ' + (item.score * item.amount)}</div>
            {
              (item.attributes && item.attributes.length) ?
                _.map(item.attributes, (x) => {
                  return <div className="inventory-slot-attribute">{x.name}</div>;
                }) : <div className="inventory-slot-no-attributes">{'No attributes'}</div>
            }
          </div>
        </div>
      </div>
    );
  }
}