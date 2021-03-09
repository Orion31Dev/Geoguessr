import React from 'react';
import GoogleMapReact from 'google-map-react';

import geoJSON from '../countries.json';

require('dotenv').config();

interface MapContainerProps {
  center: {
    lat: number;
    lng: number;
  };
  zoom: number;

  guessCallback: (guess: string) => void;
}

interface MapContainerState {
  activePoly: any | undefined;
}

export class MapContainer extends React.Component<MapContainerProps, MapContainerState> {
  constructor(props: MapContainerProps) {
    super(props);

    this.state = {
      activePoly: undefined,
    };
  }

  render() {
    return (
      <div>
        <div className={'selected-country' + (this.state.activePoly ? ' active' : '')} onClick={this.guess.bind(this)}>
          {this.state.activePoly ? this.state.activePoly.i.ADMIN : 'Select a country'}
        </div>
        <div className="map">
          <GoogleMapReact
            bootstrapURLKeys={{
              key: process.env.REACT_APP_API_KEY as string,
            }}
            defaultCenter={this.props.center}
            defaultZoom={this.props.zoom}
            onGoogleApiLoaded={({ map, maps }) => this.drawMap(map, maps)}
            yesIWantToUseGoogleMapApiInternals
          ></GoogleMapReact>
        </div>
      </div>
    );
  }

  drawMap(map: any, maps: any) {
    map.data.addGeoJson(geoJSON);
    maps.event.trigger(map, 'resize');

    map.data.setStyle({
      fillColor: '#df00ff',
      strokeColor: '#af00ff',
      strokeWeight: 1,
      strokeOpacity: 0,
      fillOpacity: 0,
    });

    map.setOptions({
      disableDefaultUI: true,
      mapTypeId: maps.MapTypeId.ROADMAP,
    });

    map.data.addListener('click', (event: any) => {
      map.data.overrideStyle(event.feature, {
        fillOpacity: 0.3,
        strokeOpacity: 1,
      });

      if (this.state.activePoly) {
        map.data.overrideStyle(this.state.activePoly, {
          strokeOpacity: 0,
          fillOpacity: 0,
        });
      }

      this.setState({ activePoly: event.feature });
    });
  }

  guess() {
    this.props.guessCallback(this.state.activePoly.i.ISO_A3);
  }
}
