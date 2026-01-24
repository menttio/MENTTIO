import AboutUs from './pages/AboutUs';
import AuthRedirect from './pages/AuthRedirect';
import Blog from './pages/Blog';
import BookClass from './pages/BookClass';
import ClassRecordings from './pages/ClassRecordings';
import Contact from './pages/Contact';
import CookiesPolicy from './pages/CookiesPolicy';
import Help from './pages/Help';
import Home from './pages/Home';
import Landing from './pages/Landing';
import LegalNotice from './pages/LegalNotice';
import ManageAvailability from './pages/ManageAvailability';
import ManageSubjects from './pages/ManageSubjects';
import Messages from './pages/Messages';
import MyClasses from './pages/MyClasses';
import MyStudents from './pages/MyStudents';
import PaymentSuccess from './pages/PaymentSuccess';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Profile from './pages/Profile';
import RenewSubscription from './pages/RenewSubscription';
import SearchTeachers from './pages/SearchTeachers';
import SelectRole from './pages/SelectRole';
import StudentDashboard from './pages/StudentDashboard';
import TeacherCalendar from './pages/TeacherCalendar';
import TeacherClassHistory from './pages/TeacherClassHistory';
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherProfile from './pages/TeacherProfile';
import TeacherSignup from './pages/TeacherSignup';
import TeacherWorkload from './pages/TeacherWorkload';
import TermsOfService from './pages/TermsOfService';
import StudentSignup from './pages/StudentSignup';
import StudentSignupComplete from './pages/StudentSignupComplete';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AboutUs": AboutUs,
    "AuthRedirect": AuthRedirect,
    "Blog": Blog,
    "BookClass": BookClass,
    "ClassRecordings": ClassRecordings,
    "Contact": Contact,
    "CookiesPolicy": CookiesPolicy,
    "Help": Help,
    "Home": Home,
    "Landing": Landing,
    "LegalNotice": LegalNotice,
    "ManageAvailability": ManageAvailability,
    "ManageSubjects": ManageSubjects,
    "Messages": Messages,
    "MyClasses": MyClasses,
    "MyStudents": MyStudents,
    "PaymentSuccess": PaymentSuccess,
    "PrivacyPolicy": PrivacyPolicy,
    "Profile": Profile,
    "RenewSubscription": RenewSubscription,
    "SearchTeachers": SearchTeachers,
    "SelectRole": SelectRole,
    "StudentDashboard": StudentDashboard,
    "TeacherCalendar": TeacherCalendar,
    "TeacherClassHistory": TeacherClassHistory,
    "TeacherDashboard": TeacherDashboard,
    "TeacherProfile": TeacherProfile,
    "TeacherSignup": TeacherSignup,
    "TeacherWorkload": TeacherWorkload,
    "TermsOfService": TermsOfService,
    "StudentSignup": StudentSignup,
    "StudentSignupComplete": StudentSignupComplete,
}

export const pagesConfig = {
    mainPage: "SelectRole",
    Pages: PAGES,
    Layout: __Layout,
};