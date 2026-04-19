import React from 'react';
import { ConnectionLineComponentProps } from '@xyflow/react';

const ConnectionLineComponent = ({ fromX, fromY, toX, toY }: ConnectionLineComponentProps) => {

  return (
    <g>
      <path
        fill="none"
        stroke={"gray"}
        strokeWidth={1.5}
        className="animated"
        d={`M${fromX},${fromY} C ${fromX} ${toY} ${fromX} ${toY} ${toX},${toY}`}
      />
      <circle
        cx={toX}
        cy={toY}
        fill="#fff"
        r={4}
        stroke={"gray"}
        strokeWidth={1.5}
      />
    </g>
  );
};

export default ConnectionLineComponent;