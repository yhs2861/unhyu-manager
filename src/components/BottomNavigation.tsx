import { NavLink } from 'react-router-dom';

const navigationItems = [
  { path: '/', label: '홈', icon: '🏠', end: true },
  { path: '/input', label: '입력', icon: '➕' },
  { path: '/calendar', label: '달력', icon: '📅' },
  { path: '/statistics', label: '통계', icon: '📊' },
  { path: '/settings', label: '설정', icon: '⚙' },
];

function BottomNavigation() {
  return (
    <nav className="bottom-navigation" aria-label="하단 메뉴">
      {navigationItems.map((item) => (
        <NavLink
          className={({ isActive }) => (isActive ? 'bottom-nav-item active' : 'bottom-nav-item')}
          end={item.end}
          key={item.path}
          to={item.path}
        >
          <span aria-hidden="true">{item.icon}</span>
          <strong>{item.label}</strong>
        </NavLink>
      ))}
    </nav>
  );
}

export default BottomNavigation;
