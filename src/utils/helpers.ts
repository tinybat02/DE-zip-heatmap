import { Vector as VectorLayer } from 'ol/layer';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Polygon from 'ol/geom/Polygon';
import { Style, Fill } from 'ol/style';
import { Frame } from '../types';
import { zip_polygons } from './zipcode';

type ZipKey = keyof typeof zip_polygons;

const percentageToHsl = (percentage: number) => {
  const hue = percentage * -120 + 120;
  return 'hsla(' + hue + ', 100%, 50%, 0.3)';
};

const createPolygon = (coordinates: number[][][], value: string, color: string) => {
  const polygonFeature = new Feature({
    type: 'Polygon',
    geometry: new Polygon(coordinates).transform('EPSG:4326', 'EPSG:3857'),
  });
  polygonFeature.set('value', value);
  polygonFeature.set('color', color);
  polygonFeature.setStyle(
    new Style({
      fill: new Fill({
        color: color,
      }),
    })
  );
  return polygonFeature;
};

export const createHeatLayer = (series: Frame[]) => {
  const stores: string[] = [];
  const assignValueToStore: { [key: string]: number } = {};
  const assignValueToStoreLog: { [key: string]: number } = {};

  series.map((item) => {
    const sumValue = item.fields[0].values.buffer.reduce((sum, elm) => sum + elm, 0);
    if (item.name /* && sumValue > 3 */) {
      stores.push(item.name);
      assignValueToStore[item.name] = sumValue;
      assignValueToStoreLog[item.name] = Math.log2(sumValue);
    }
  });

  const heatValues = Object.values(assignValueToStoreLog);
  const max = Math.max(...heatValues);
  const min = Math.min(...heatValues);
  const range = max - min;

  const polygons: Feature[] = [];

  stores.map((zip) => {
    if (zip in zip_polygons) {
      const percentage = (assignValueToStoreLog[zip] - min) / range;
      polygons.push(
        createPolygon(
          zip_polygons[zip as ZipKey],
          assignValueToStore[zip].toString(),
          range != 0 ? percentageToHsl(percentage) : 'hsla(49, 100%, 50%, 0.3)'
        )
      );
    }
  });

  // geojson.features.map((feature) => {
  //   if (feature.properties && feature.properties.name && stores.includes(feature.properties.name)) {
  //     const percentage = (assignValueToStoreLog[feature.properties.name] - min) / range;
  //     polygons.push(
  //       createPolygon(
  //         feature,
  //         assignValueToStore[feature.properties.name].toString(),
  //         range != 0 ? percentageToHsl(percentage) : 'hsla(49, 100%, 50%, 0.3)'
  //       )
  //     );
  //   }
  // });

  return new VectorLayer({
    source: new VectorSource({
      features: polygons,
    }),
    zIndex: 2,
  });
};
