import BookClass from './pages/BookClass';
import ClassRecordings from './pages/ClassRecordings';
import Help from './pages/Help';
import ManageAvailability from './pages/ManageAvailability';
import ManageSubjects from './pages/ManageSubjects';
import Messages from './pages/Messages';
import MyClasses from './pages/MyClasses';
import MyStudents from './pages/MyStudents';
import PaymentSuccess from './pages/PaymentSuccess';
import RenewSubscription from './pages/RenewSubscription';
import SearchTeachers from './pages/SearchTeachers';
import SelectRole from './pages/SelectRole';
import StudentDashboard from './pages/StudentDashboard';
import TeacherCalendar from './pages/TeacherCalendar';
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherProfile from './pages/TeacherProfile';
import TeacherSignup from './pages/TeacherSignup';
import TeacherWorkload from './pages/TeacherWorkload';
import Profile from './pages/Profile';
import __Layout from './Layout.jsx';


export const PAGES = {
    "BookClass": BookClass,
    "ClassRecordings": ClassRecordings,
    "Help": Help,
    "ManageAvailability": ManageAvailability,
    "ManageSubjects": ManageSubjects,
    "Messages": Messages,
    "MyClasses": MyClasses,
    "MyStudents": MyStudents,
    "PaymentSuccess": PaymentSuccess,
    "RenewSubscription": RenewSubscription,
    "SearchTeachers": SearchTeachers,
    "SelectRole": SelectRole,
    "StudentDashboard": StudentDashboard,
    "TeacherCalendar": TeacherCalendar,
    "TeacherDashboard": TeacherDashboard,
    "TeacherProfile": TeacherProfile,
    "TeacherSignup": TeacherSignup,
    "TeacherWorkload": TeacherWorkload,
    "Profile": Profile,
}

export const pagesConfig = {
    mainPage: "SelectRole",
    Pages: PAGES,
    Layout: __Layout,
};