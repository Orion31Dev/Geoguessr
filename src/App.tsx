import React from 'react';
import './App.css';
import { MapContainer } from './maps/MapContainer';
import { StreetViewContainer } from './maps/StreetViewContainer';

require('dotenv').config();

class App extends React.Component<any, any> {
  render() {
    return (
      <div className="App">
        <header className="App-header">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', width: '100%' }}>
            <MapContainer center={{ lat: 0, lng: 0 }} zoom={1}></MapContainer>
            <StreetViewContainer center={{ lat: 41.157398, lng: -73.356401 }} zoom={11}></StreetViewContainer>
          </div>
        </header>
      </div>
    );
  }
}

export default App;
