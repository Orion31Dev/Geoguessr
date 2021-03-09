import React from 'react';
import GoogleMapReact from 'google-map-react';

interface StreetViewContainerProps {
  center: {
    lat: number;
    lng: number;
  };
  zoom: number;

  usedCountries: { lat: number; lng: number }[];

  doneCallback: Function;
}

interface StreetViewContainerState {}

export class StreetViewContainer extends React.Component<StreetViewContainerProps, StreetViewContainerState> {
  panorama: any;

  constructor(props: StreetViewContainerProps) {
    super(props);
    this.panorama = React.createRef();
  }

  render() {
    console.log(process.env);
    return (
      <div id={'map'} style={{ height: '99vh', width: '99.5%' }}>
        <GoogleMapReact
          bootstrapURLKeys={{ key: process.env.REACT_APP_API_KEY as string }}
          defaultCenter={this.props.center}
          defaultZoom={this.props.zoom}
          ref={this.panorama}
          onGoogleApiLoaded={({ map, maps }) => this.apiIsLoaded(map, maps)}
          yesIWantToUseGoogleMapApiInternals
        ></GoogleMapReact>
      </div>
    );
  }

  apiIsLoaded = async (_map: any, maps: any) => {
    let sv = new maps.StreetViewService();
    let panorama = new maps.StreetViewPanorama(document.getElementById('map'));

    let loc = this.getRandomLatLng();

    fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${loc.lat},${loc.lng}&key=${process.env.REACT_APP_API_KEY}`)
      .then((res) => res.json())
      .then((data: any) => {
        data.results.forEach((obj: any) => {
          if (obj.types.includes('country')) {
            this.props.doneCallback(obj.formatted_address, obj.address_components[0].short_name, loc);
          }
        });
      });

    sv.getPanorama({ location: loc, radius: 100 }, (data: any, _status: any) => {
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

  getRandomLatLng() {
    let l;

    do l = locations[Math.floor(randomRange(0, locations.length))];
    while (this.props.usedCountries.includes(l));

    return l;
  }
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
  { lat: 41.3634072, lng: -73.3975717 },
  { lat: 44.9192292, lng: -62.532586 },
  { lat: 40.1207131, lng: -8.0118417 },
  { lat: 67.8798408, lng: 12.9867343 },
  { lat: -17.5604385, lng: -63.1365314 },
  { lat: -26.8529941, lng: 31.4497908 },
  { lat: 40.3464178, lng: -8.1551664 },
  { lat: 49.3928488, lng: 18.7088397 },
  { lat: 40.9810828, lng: 27.5556263 },
  { lat: 64.1731608, lng: -51.7343051 },
  { lat: 41.7157167, lng: 21.770502 },
  { lat: 14.9706254, lng: 104.9803361 },
  { lat: 43.2078441, lng: 21.6482873 },
  { lat: 25.5544837, lng: 55.6787714 },
  { lat: 14.4455392, lng: -17.0187311 },
  { lat: -36.0325905, lng: 144.5291183 },
  { lat: 1.3833601, lng: 103.7749793 },
  { lat: 63.4455214, lng: 10.4253912 },
  { lat: 57.7078598, lng: -3.4348632 },
  { lat: 51.5145124, lng: -0.0969188 },
  { lat: 48.6476029, lng: 2.3356988 },
  { lat: 48.7117689, lng: 1.5395125 },
  { lat: 40.6293196, lng: -3.1639421 },
  { lat: 39.3628123, lng: -8.224751 },
];

function randomRange(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
