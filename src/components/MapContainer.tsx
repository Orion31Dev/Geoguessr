import React from 'react';
import GoogleMapReact from 'google-map-react';

import geoJSON from '../countries.json';

interface MapContainerProps {
  center: {
    lat: number;
    lng: number;
  };
  zoom: number;

  block: string[];

  right: string;

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
      <div style={{ position: 'absolute', right: this.props.right, bottom: '3.5vh', zIndex: 100, width: '25vw' }}>
        <div className={'map'}>
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
        <div className={'selected-country' + (this.state.activePoly ? ' active' : '')} onClick={this.guess.bind(this)}>
          {this.state.activePoly ? this.state.activePoly.i.ADMIN : 'Select a country'}
        </div>
      </div>
    );
  }

  drawMap(map: any, maps: any) {
    map.data.addGeoJson(geoJSON).forEach((f: any) => {
      if (this.props.block.includes(f.i.ISO_A3)) {
        map.data.overrideStyle(f, {
          fillColor: '#ff0000',
          strokeColor: '#ff0000',
          strokeWeight: 1,
          strokeOpacity: 1,
          fillOpacity: 0.3,
        });
      }
    });

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
      if (this.props.block.includes(event.feature.i.ISO_A3)) return;
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
