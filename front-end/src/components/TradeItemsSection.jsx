import React from "react";
import PropTypes from "prop-types";
import TradeItemsSectionSlot from "./TradeItemsSectionSlot.jsx";
import * as _ from "underscore";

export default class TradeItemsSection extends React.Component {

  static contextTypes = {
    apiHandler: PropTypes.object.isRequired,
    currentUser: PropTypes.object.isRequired,
  };

  static propTypes = {
    userId: PropTypes.number,
    items: PropTypes.array,
    onRemoveItem: PropTypes.func,
    size: PropTypes.number,
  };

  constructor(props) {
    super();
    this.state = {
      user: null,
    };
  }

  componentDidMount() {
    this.loadUser();
  }

  loadUser(){
    this.context.apiHandler.getUser(this.props.userId).then((user)=>{
      this.setState({
        user: user,
      });
    });
  }

  render() {
    const {items, onRemoveItem, size} = this.props;
    const {user} = this.state;
    if (!user){
      return null;
    }
    return (
      <div className="trade-items-section">
        <h1>{user.display_name + '\'s offered items'}</h1>
        <div className="trade-items-container">
          {
            _.map(_.range(0, size), (idx)=>{
              return (<TradeItemsSectionSlot item={items[idx]} idx={idx} onRemoveItem={onRemoveItem}/>);
            })
          }
        </div>
      </div>)
  }
}