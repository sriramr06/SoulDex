import Topbar from './layout/Topbar';

// Simple compatibility component: some pages import `Navbar`.
const Navbar = (props) => {
  return <Topbar {...props} />;
};

export default Navbar;
