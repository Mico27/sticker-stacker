import React from "react";
import PropTypes from "prop-types";

export default class Sticker extends React.Component {

  static propTypes = {
    idx: PropTypes.number,
    image: PropTypes.string,
  };

  constructor(props) {
    super(props);
    this.state = {
      rotation: (Math.floor(Math.random() * (4)) - 2),
      spawn: true,
    };
    this.onAnimationEnd = this.onAnimationEnd.bind(this);
  }


  componentDidMount() {
    this.playSpawnAnimation();
    this.sticker.addEventListener("animationend", this.onAnimationEnd, true);
  }

  componentWillUnmount() {
    this.sticker.removeEventListener("animationend", this.onAnimationEnd, true);
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (prevProps.key !== this.props.key){
      this.playSpawnAnimation();
    }
  }

  onAnimationEnd(){
    this.setState({
      spawn: false,
    });
  }

  playSpawnAnimation(){
    this.setState({
      spawn: true,
      rotation: (Math.floor(Math.random() * (4)) - 2),
    });
  }


  render() {
    const {rotation, spawn} = this.state;
    return (
      <img ref={(ref)=>this.sticker = ref}
           className={"inventory-slot-img" + ((spawn)? " inventory-slot-img-spawn": "")}
           src={this.props.image}
           style={{"--sticker-rotation":`${rotation}deg`, "--sticker-translation":`-${this.props.idx * 2}px, -${this.props.idx * 2}px`}}/>
    );
  }
}