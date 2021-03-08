import React from 'react';
import GoogleMapReact from 'google-map-react';
require('dotenv').config();

interface StreetViewContainerProps {
  center: {
    lat: number;
    lng: number;
  };
  zoom: 11;
}

export class StreetViewContainer extends React.Component<StreetViewContainerProps> {
  panorama: any;

  constructor(props: StreetViewContainerProps) {
    super(props);
    this.panorama = React.createRef();
  }

  render() {
    return (
      <div id={'map'} style={{ height: '95vh', width: '95%' }}>
        <GoogleMapReact
          bootstrapURLKeys={{ key: process.env.REACT_APP_API_KEY as string }}
          defaultCenter={this.props.center}
          defaultZoom={this.props.zoom}
          ref={this.panorama}
          onGoogleApiLoaded={({ map, maps }) => this.apiIsLoaded(map, maps)}
        ></GoogleMapReact>
      </div>
    );
  }

  apiIsLoaded = async (_map: any, maps: any) => {
    let sv = new maps.StreetViewService();
    let panorama = new maps.StreetViewPanorama(document.getElementById('map'));

    const loc = getRandomLatLng();

    console.log(loc);

    sv.getPanorama({ location: loc, radius: 50 }, (data: any, _status: any) => {
      panorama.setPano(data.location.pano);
      panorama.setPov({
        heading: 270,
        pitch: 0,
      });
      panorama.setVisible(true);
      panorama.setOptions({
        showRoadLabels: false,
        disableDefaultUI: true,
      });
    });
  };
}

const locations = [
  { lat: 64.9296689, lng: -147.629437 },
  { lat: -12.9594884, lng: -38.483756 },
  { lat: -17.7832528, lng: -63.1891003 },
  { lat: -25.2959187, lng: -57.5798229 },
  { lat: -33.4369638, lng: -70.6583966 },
  { lat: -33.4369638, lng: -70.6583966 },
  { lat: -35.1746662, lng: -58.2285172 },
  { lat: 49.9102813, lng: -97.1710041 },
];

function getRandomLatLng() {
  return locations[Math.floor(randomRange(0, locations.length))];
}

function randomRange(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
