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
import AboutUs from './pages/AboutUs';
import AuthRedirect from './pages/AuthRedirect';
import Blog from './pages/Blog';
import BookClass from './pages/BookClass';
import ClassRecordings from './pages/ClassRecordings';
import Contact from './pages/Contact';
import CookiesPolicy from './pages/CookiesPolicy';
import Home from './pages/Home';
import Landing from './pages/Landing';
import LegalNotice from './pages/LegalNotice';
import ManageAvailability from './pages/ManageAvailability';
import ManageSubjects from './pages/ManageSubjects';
import Messages from './pages/Messages';
import MyClasses from './pages/MyClasses';
import MyStudents from './pages/MyStudents';
import MyTeachers from './pages/MyTeachers';
import PaymentSuccess from './pages/PaymentSuccess';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Profile from './pages/Profile';
import RenewSubscription from './pages/RenewSubscription';
import ReviewsHistory from './pages/ReviewsHistory';
import SearchTeachers from './pages/SearchTeachers';
import SelectRole from './pages/SelectRole';
import StudentDashboard from './pages/StudentDashboard';
import StudentSignup from './pages/StudentSignup';
import StudentSignupComplete from './pages/StudentSignupComplete';
import TeacherCalendar from './pages/TeacherCalendar';
import TeacherClassHistory from './pages/TeacherClassHistory';
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherProfile from './pages/TeacherProfile';
import TeacherSignup from './pages/TeacherSignup';
import TeacherWorkload from './pages/TeacherWorkload';
import TermsOfService from './pages/TermsOfService';
import UserNotRegistered from './pages/UserNotRegistered';
import TeacherSignupComplete from './pages/TeacherSignupComplete';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AboutUs": AboutUs,
    "AuthRedirect": AuthRedirect,
    "Blog": Blog,
    "BookClass": BookClass,
    "ClassRecordings": ClassRecordings,
    "Contact": Contact,
    "CookiesPolicy": CookiesPolicy,
    "Home": Home,
    "Landing": Landing,
    "LegalNotice": LegalNotice,
    "ManageAvailability": ManageAvailability,
    "ManageSubjects": ManageSubjects,
    "Messages": Messages,
    "MyClasses": MyClasses,
    "MyStudents": MyStudents,
    "MyTeachers": MyTeachers,
    "PaymentSuccess": PaymentSuccess,
    "PrivacyPolicy": PrivacyPolicy,
    "Profile": Profile,
    "RenewSubscription": RenewSubscription,
    "ReviewsHistory": ReviewsHistory,
    "SearchTeachers": SearchTeachers,
    "SelectRole": SelectRole,
    "StudentDashboard": StudentDashboard,
    "StudentSignup": StudentSignup,
    "StudentSignupComplete": StudentSignupComplete,
    "TeacherCalendar": TeacherCalendar,
    "TeacherClassHistory": TeacherClassHistory,
    "TeacherDashboard": TeacherDashboard,
    "TeacherProfile": TeacherProfile,
    "TeacherSignup": TeacherSignup,
    "TeacherWorkload": TeacherWorkload,
    "TermsOfService": TermsOfService,
    "UserNotRegistered": UserNotRegistered,
    "TeacherSignupComplete": TeacherSignupComplete,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};