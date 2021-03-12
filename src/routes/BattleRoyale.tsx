import React from 'react';
import { MapContainer } from '../components/MapContainer';
import { StreetViewContainer } from '../components/StreetViewContainer';
import { io } from 'socket.io-client';

interface BattleRoyaleState {
  correct: boolean;
  guessed: boolean;

  rounds: boolean[];

  loc: { lat: number; lng: number } | undefined;

  room404: boolean;

  players: any[];
}

export default class BattleRoyale extends React.Component<any, BattleRoyaleState> {
  map: any;
  socket: any;

  constructor(props: any) {
    super(props);

    this.map = React.createRef();
    this.state = {
      correct: false,
      guessed: false,
      rounds: [],
      loc: { lat: 45, lng: -30 },

      players: [],
      room404: false,
    };
  }

  componentDidMount() {
    this.socket = io();
    this.socket.emit('join', this.props.match.params.room);

    this.socket.on('players', (p: any[]) => this.setState({ players: p }));
    this.socket.on('room-404', () => this.setState({ room404: true }));
  }

  render() {
    return (
      <div className="App">
        {this.state.room404 ? (
          <div>
            <div className="r404">404</div>
            <div className="r404-desc">ROOM NOT FOUND</div>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', width: '80%' }}>
              <MapContainer
                center={{ lat: 45, lng: 45 }}
                zoom={0}
                guessCallback={this.guess.bind(this)}
                ref={this.map}
                key={this.state.rounds.length}
                right={'21vw'}
              ></MapContainer>
              {this.state.loc && (
                <StreetViewContainer
                  center={{ lat: 41.157398, lng: -73.356401 }}
                  zoom={0}
                  doneCallback={this.streetViewDone.bind(this)}
                  key={this.state.rounds.length + 1}
                  loc={this.state.loc}
                ></StreetViewContainer>
              )}
            </div>
            <div className="room-info">
              <div className="players">
                <div className="players-header">Players</div>
                {this.renderPlayers()}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  guess() {}

  streetViewDone() {}

  renderPlayers() {
    let i = 0;
    return this.state.players.map((p) => (
      <div key={i} className={'player'}>
        {p.id}
      </div>
    ));
  }
}
