import ClassRecordings from './pages/ClassRecordings';
import Help from './pages/Help';
import ManageAvailability from './pages/ManageAvailability';
import ManageSubjects from './pages/ManageSubjects';
import Messages from './pages/Messages';
import MyClasses from './pages/MyClasses';
import MyStudents from './pages/MyStudents';
import RenewSubscription from './pages/RenewSubscription';
import SelectRole from './pages/SelectRole';
import TeacherCalendar from './pages/TeacherCalendar';
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherProfile from './pages/TeacherProfile';
import TeacherSignup from './pages/TeacherSignup';
import TeacherWorkload from './pages/TeacherWorkload';
import BookClass from './pages/BookClass';
import SearchTeachers from './pages/SearchTeachers';
import StudentDashboard from './pages/StudentDashboard';
import PaymentSuccess from './pages/PaymentSuccess';
import __Layout from './Layout.jsx';


export const PAGES = {
    "ClassRecordings": ClassRecordings,
    "Help": Help,
    "ManageAvailability": ManageAvailability,
    "ManageSubjects": ManageSubjects,
    "Messages": Messages,
    "MyClasses": MyClasses,
    "MyStudents": MyStudents,
    "RenewSubscription": RenewSubscription,
    "SelectRole": SelectRole,
    "TeacherCalendar": TeacherCalendar,
    "TeacherDashboard": TeacherDashboard,
    "TeacherProfile": TeacherProfile,
    "TeacherSignup": TeacherSignup,
    "TeacherWorkload": TeacherWorkload,
    "BookClass": BookClass,
    "SearchTeachers": SearchTeachers,
    "StudentDashboard": StudentDashboard,
    "PaymentSuccess": PaymentSuccess,
}

export const pagesConfig = {
    mainPage: "SelectRole",
    Pages: PAGES,
    Layout: __Layout,
};