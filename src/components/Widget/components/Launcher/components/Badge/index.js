import React from 'react';

import './style.scss';

const Badge = ({ badge }) =>
  badge > 0 &&
  <span className="rw-badge">{badge}</span>;

export default Badge;
