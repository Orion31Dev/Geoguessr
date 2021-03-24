import React from 'react';
import { Socket } from 'socket.io-client';

interface BattleRoyaleUsernamePopupState {
  username: string;

  shakeUsername: boolean;
}

export default class BattleRoyaleUsernamePopup extends React.Component<any, BattleRoyaleUsernamePopupState> {
  socket: Socket | undefined = undefined;

  constructor(props: any) {
    super(props);

    this.state = {
      username: '',

      shakeUsername: false,
    };
  }

  render() {
    return (
      <div className="App">
        <div className="lobby">
          <div className="popup-float-above">
            <div className="lobby-header">BATTLE ROYALE</div>
            <div className="lobby-room-code">Room Code: {this.props.match.params.room}</div>
          </div>

          <div className="popup-tag">Enter Username to continue</div>
          <input
            className={'input-username popup-input' + (this.state.shakeUsername ? ' shake' : '')}
            placeholder={'Username'}
            maxLength={7}
            value={this.state.username}
            onAnimationEnd={() => this.setState({ shakeUsername: false })}
            onChange={(e) => this.setState({ username: e.target.value })}
          ></input>
          <div className="btn-username-submit" onClick={this.join.bind(this)}>
            Join
          </div>
        </div>
      </div>
    );
  }

  join() {
    if (this.state.username.length < 1) {
      this.setState({ shakeUsername: true });
      return;
    }

    localStorage.setItem('username', this.state.username);
    window.location.href = "/br/" + this.props.match.params.room;
  }
}
