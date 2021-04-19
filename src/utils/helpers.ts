import { Vector as VectorLayer } from 'ol/layer';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Polygon from 'ol/geom/Polygon';
import { Style, Fill } from 'ol/style';
import zipData from './zipdata';
import { zip_polygons } from './zipcode';

type ZipKey = keyof typeof zipData;

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

export const createHeatLayer = () => {
  const assignValueToStore: { [key: string]: number } = {};
  const total = Object.values(zipData).reduce((sum, i) => sum + i, 0);

  const assignValueToStoreLog: { [key: string]: number } = {};

  Object.keys(zipData).map((zip) => {
    //@ts-ignore
    assignValueToStore[zip] = (zipData[zip] * 100) / total;
    //@ts-ignore
    assignValueToStoreLog[zip] = Math.log2(zipData[zip]);
  });

  const heatValues = Object.values(assignValueToStoreLog);
  const max = Math.max(...heatValues);
  const min = Math.min(...heatValues);
  const range = max - min;

  const polygons: Feature[] = [];

  Object.keys(zipData).map((zip) => {
    if (zip in zip_polygons) {
      const percentage = (assignValueToStoreLog[zip] - min) / range;
      polygons.push(
        createPolygon(
          zip_polygons[zip as ZipKey],
          assignValueToStore[zip].toFixed(2) + ' %',
          range != 0 ? percentageToHsl(percentage) : 'hsla(49, 100%, 50%, 0.3)'
        )
      );
    }
  });

  return new VectorLayer({
    source: new VectorSource({
      features: polygons,
    }),
    zIndex: 2,
  });
};
