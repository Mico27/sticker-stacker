import React from "react";
import PropTypes from "prop-types";
import * as _ from "underscore";
import Sticker from "./Sticker.jsx";

const MAX_STACKS = 5;
const REQ_FOR_STACK = 2;

export default class StickerStack extends React.Component {

  static propTypes = {
    amount: PropTypes.number,
    image: PropTypes.string,
  };

  constructor(props) {
    super(props);
  }

  render() {
    const {amount, image} = this.props;
    const stackArray = _.range(Math.min(Math.ceil(amount / REQ_FOR_STACK), MAX_STACKS + 1));
    return (
      _.map(stackArray, (x)=>{
        return <Sticker key={(stackArray[stackArray.length -1] === x)? amount: x} idx={x} image={image}/>;
      })
    );
  }
}