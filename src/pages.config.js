/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import ContractDetail from './pages/ContractDetail';
import ContractForm from './pages/ContractForm';
import Contracts from './pages/Contracts';
import Dashboard from './pages/Dashboard';
import Payments from './pages/Payments';
import Profiles from './pages/Profiles';
import Templates from './pages/Templates';
import Folders from './pages/Folders';
import TaxReports from './pages/TaxReports';
import VenuePaymentRecords from './pages/VenuePaymentRecords';
import Network from './pages/Network';
import AdminClauses from './pages/AdminClauses';
import AdminBilling from './pages/AdminBilling';
import MyClauses from './pages/MyClauses';
import Onboarding from './pages/Onboarding';
import __Layout from './Layout.jsx';


export const PAGES = {
    "ContractDetail": ContractDetail,
    "ContractForm": ContractForm,
    "Contracts": Contracts,
    "Dashboard": Dashboard,
    "Payments": Payments,
    "Profiles": Profiles,
    "Templates": Templates,
    "Folders": Folders,
    "TaxReports": TaxReports,
    "VenuePaymentRecords": VenuePaymentRecords,
    "Network": Network,
    "AdminClauses": AdminClauses,
    "AdminBilling": AdminBilling,
    "MyClauses": MyClauses,
    "Onboarding": Onboarding,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};