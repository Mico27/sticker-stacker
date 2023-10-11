import React from "react";
import PropTypes from "prop-types";

export default class ShinyEffect extends React.Component {

  static propTypes = {
    minX: PropTypes.number,
    maxX: PropTypes.number,
    minY: PropTypes.number,
    maxY: PropTypes.number,
    minScale: PropTypes.number,
    maxScale: PropTypes.number,
  };

  static defaultProps = {
    minX: 20,
    maxX: 130,
    minY: 20,
    maxY: 130,
    minScale: 0.5,
    maxScale: 1.0,
  };

  constructor(props) {
    super(props);
    this.onAnimationIteration = this.onAnimationIteration.bind(this);
  }

  componentDidMount() {
    this.sparkles.style.animationDelay = (Math.random() + 's');
    this.sparkles.addEventListener("animationiteration", this.onAnimationIteration, true);
    this.onAnimationIteration();
  }

  componentWillUnmount() {
    this.sparkles.removeEventListener("animationiteration", this.onAnimationIteration, true);
  }

  onAnimationIteration(){
    const { minX, maxX, minY, maxY, minScale, maxScale } = this.props;
    this.container.style.top = ((Math.floor(Math.random() * (maxY - minY)) + minY) + 'px');
    this.container.style.left = ((Math.floor(Math.random() * (maxX - minX)) + minX) + 'px');
    this.sparkles.style.transform = `translate(-50%, -50%) scale(${((Math.random() * (maxScale - minScale)) + minScale)})`;
  }

  render() {
    return (
      <div className="shiny-container" ref={(ref)=> this.container = ref}>
        <div className="shiny-sprite" ref={(ref)=> this.sparkles = ref}/>
      </div>
    );
  }
}