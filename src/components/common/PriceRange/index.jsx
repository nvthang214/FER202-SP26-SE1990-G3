import PropType from 'prop-types';
import React, { useState, useEffect, useRef } from 'react';
import {
  Handles, Rail, Slider, Tracks
} from 'react-compound-slider';
import Handle from './Handle';
import SliderRail from './SliderRail';
import Track from './Track';

const sliderStyle = { position: 'relative', width: '100%' };

// Format số có dấu phân cách hàng nghìn
const formatNumber = (n) => Number(n).toLocaleString('en-US');

// Bỏ dấu phân cách, trả về số nguyên
const parseNumber = (str) => parseInt(String(str).replace(/[^0-9]/g, ''), 10) || 0;

const PriceRange = ({
  min, max, initMin, initMax, productsCount, onPriceChange
}) => {
  const [values, setValues]     = useState([initMin || min, initMax || max]);
  const [inputMin, setInputMin] = useState(formatNumber(initMin || min));
  const [inputMax, setInputMax] = useState(formatNumber(initMax || max));
  const [error, setError]       = useState('');
  const debounceRef             = useRef(null);

  // Sync khi min/max thay đổi từ bên ngoài
  useEffect(() => {
    setValues([initMin || min, initMax || max]);
    setInputMin(formatNumber(initMin || min));
    setInputMax(formatNumber(initMax || max));
  }, [min, max]);

  // Slider kéo → cập nhật input text
  const onSliderChange = (newValues) => {
    setValues(newValues);
    setInputMin(formatNumber(newValues[0]));
    setInputMax(formatNumber(newValues[1]));
    setError('');
    onPriceChange(newValues[0], newValues[1]);
  };

  // Người dùng gõ vào input → debounce 500ms rồi apply
  const handleInputChange = (side, raw) => {
    if (side === 'min') setInputMin(raw);
    else setInputMax(raw);

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const numMin = side === 'min' ? parseNumber(raw) : values[0];
      const numMax = side === 'max' ? parseNumber(raw) : values[1];

      if (numMin < min || numMax > max) {
        setError(`Giá trị phải trong khoảng ${formatNumber(min)} – ${formatNumber(max)}`);
        return;
      }
      if (numMin >= numMax) {
        setError('Giá min phải nhỏ hơn giá max');
        return;
      }

      setError('');
      setValues([numMin, numMax]);
      onPriceChange(numMin, numMax);
    }, 500);
  };

  // Khi blur → format lại số và clamp về domain
  const handleBlur = (side) => {
    const numMin = parseNumber(inputMin);
    const numMax = parseNumber(inputMax);

    const clampedMin = Math.max(min, Math.min(numMin, numMax - 1));
    const clampedMax = Math.min(max, Math.max(numMax, numMin + 1));

    setValues([clampedMin, clampedMax]);
    setInputMin(formatNumber(clampedMin));
    setInputMax(formatNumber(clampedMax));
    setError('');

    if (clampedMin !== values[0] || clampedMax !== values[1]) {
      onPriceChange(clampedMin, clampedMax);
    }
  };

  const inputBase = {
    width: '100%',
    border: error ? '1px solid #f72d2d' : '1px solid #e0e0e0',
    borderRadius: 6,
    padding: '6px 8px',
    fontSize: '0.82rem',
    fontWeight: 600,
    fontFamily: 'inherit',
    textAlign: 'center',
    background: '#fafafa',
    outline: 'none',
    color: '#1a1a1a',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box'
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Input row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.7rem', color: '#999', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Min</div>
          <input
            style={inputBase}
            type="text"
            inputMode="numeric"
            disabled={productsCount === 0}
            value={inputMin}
            onChange={(e) => handleInputChange('min', e.target.value)}
            onBlur={() => handleBlur('min')}
            onFocus={(e) => e.target.select()}
          />
        </div>

        <div style={{ color: '#ccc', fontSize: '0.9rem', marginTop: 16, flexShrink: 0 }}>—</div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.7rem', color: '#999', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Max</div>
          <input
            style={inputBase}
            type="text"
            inputMode="numeric"
            disabled={productsCount === 0}
            value={inputMax}
            onChange={(e) => handleInputChange('max', e.target.value)}
            onBlur={() => handleBlur('max')}
            onFocus={(e) => e.target.select()}
          />
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div style={{ fontSize: '0.75rem', color: '#f72d2d', marginBottom: '0.6rem', lineHeight: 1.3 }}>
          {error}
        </div>
      )}

      {/* Slider */}
      <div style={{ height: 40, paddingTop: 10 }}>
        <Slider
          mode={1}
          step={1}
          domain={[min, max]}
          rootStyle={sliderStyle}
          onChange={onSliderChange}
          values={values}
          disabled={productsCount === 0}
        >
          <Rail>
            {({ getRailProps }) => <SliderRail getRailProps={getRailProps} />}
          </Rail>
          <Handles>
            {({ handles, activeHandleID, getHandleProps }) => (
              <div className="slider-handles">
                {handles.map((handle) => (
                  <Handle
                    key={handle.id}
                    handle={handle}
                    domain={[min, max]}
                    isActive={handle.id === activeHandleID}
                    getHandleProps={getHandleProps}
                    disabled={productsCount === 0}
                  />
                ))}
              </div>
            )}
          </Handles>
          <Tracks left={false} right={false}>
            {({ tracks, getTrackProps }) => (
              <div className="slider-tracks">
                {tracks.map(({ id, source, target }) => (
                  <Track
                    key={id}
                    source={source}
                    target={target}
                    getTrackProps={getTrackProps}
                  />
                ))}
              </div>
            )}
          </Tracks>
        </Slider>
      </div>

      {/* Min/Max label */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        <span style={{ fontSize: '0.72rem', color: '#bbb' }}>{formatNumber(min)}</span>
        <span style={{ fontSize: '0.72rem', color: '#bbb' }}>{formatNumber(max)}</span>
      </div>
    </div>
  );
};

PriceRange.defaultProps = {
  initMin: undefined,
  initMax: undefined
};

PriceRange.propTypes = {
  initMin: PropType.number,
  initMax: PropType.number,
  min: PropType.number.isRequired,
  max: PropType.number.isRequired,
  productsCount: PropType.number.isRequired,
  onPriceChange: PropType.func.isRequired
};

export default PriceRange;