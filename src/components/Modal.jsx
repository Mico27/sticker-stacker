import React from "react";
import PropTypes from "prop-types";

export default class Modal extends React.Component {

  static propTypes = {
    isOpen: PropTypes.bool,
    hasCloseBtn: PropTypes.bool,
    onClose: PropTypes.func,
  };

  constructor(props) {
    super(props);
    this.state = {
      isOpen: props.isOpen,
    };
    this.onCloseModal = this.onCloseModal.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
  }

  componentDidMount() {
    if (this.dialog){
      if (this.props.isOpen) {
        this.dialog.showModal();
      } else {
        this.dialog.close();
      }
    }
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (prevProps.isOpen !== this.props.isOpen){
      this.setState({
        isOpen: this.props.isOpen,
      });
    }
    if (prevState.isOpen !== this.state.isOpen){
      if (this.dialog){
        if (this.props.isOpen) {
          this.dialog.showModal();
        } else {
          this.dialog.close();
        }
      }
    }
  }

  onCloseModal(){
    if (this.props.onClose) {
      this.props.onClose();
    }
    this.setState({
      isOpen: false,
    });
  }

  onKeyDown(event){
    if (event.key === "Escape") {
      this.onCloseModal();
    }
  }

  render() {
    const {hasCloseBtn, children} = this.props;
    return (
      <dialog ref={(ref)=> this.dialog = ref} className="modal" onKeyDown={this.onKeyDown}>
        {hasCloseBtn && (
          <button className="modal-close-btn" onClick={this.onCloseModal}>
            Close
          </button>
        )}
        {children}
      </dialog>
    );
  }
}