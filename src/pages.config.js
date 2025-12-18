import SelectRole from './pages/SelectRole';
import StudentDashboard from './pages/StudentDashboard';
import BookClass from './pages/BookClass';
import MyClasses from './pages/MyClasses';
import SearchTeachers from './pages/SearchTeachers';
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherCalendar from './pages/TeacherCalendar';
import ManageAvailability from './pages/ManageAvailability';
import MyStudents from './pages/MyStudents';
import Messages from './pages/Messages';
import __Layout from './Layout.jsx';


export const PAGES = {
    "SelectRole": SelectRole,
    "StudentDashboard": StudentDashboard,
    "BookClass": BookClass,
    "MyClasses": MyClasses,
    "SearchTeachers": SearchTeachers,
    "TeacherDashboard": TeacherDashboard,
    "TeacherCalendar": TeacherCalendar,
    "ManageAvailability": ManageAvailability,
    "MyStudents": MyStudents,
    "Messages": Messages,
}

export const pagesConfig = {
    mainPage: "SelectRole",
    Pages: PAGES,
    Layout: __Layout,
};