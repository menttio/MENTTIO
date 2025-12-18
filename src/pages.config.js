import SelectRole from './pages/SelectRole';
import StudentDashboard from './pages/StudentDashboard';
import BookClass from './pages/BookClass';
import MyClasses from './pages/MyClasses';
import SearchTeachers from './pages/SearchTeachers';
import __Layout from './Layout.jsx';


export const PAGES = {
    "SelectRole": SelectRole,
    "StudentDashboard": StudentDashboard,
    "BookClass": BookClass,
    "MyClasses": MyClasses,
    "SearchTeachers": SearchTeachers,
}

export const pagesConfig = {
    mainPage: "SelectRole",
    Pages: PAGES,
    Layout: __Layout,
};