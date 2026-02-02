import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  MessageCircle, 
  Plus, 
  Loader2,
  User,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { motion } from 'framer-motion';
import ConversationList from '../components/chat/ConversationList';
import ChatWindow from '../components/chat/ChatWindow';

export default function Messages() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
  const [availableContacts, setAvailableContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState('');
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Determine role
      const teachers = await base44.entities.Teacher.filter({ user_email: currentUser.email });
      if (teachers.length > 0) {
        setUserRole('teacher');
        setUserProfile(teachers[0]);
        await loadTeacherData(teachers[0]);
      } else {
        const students = await base44.entities.Student.filter({ user_email: currentUser.email });
        if (students.length > 0) {
          setUserRole('student');
          setUserProfile(students[0]);
          await loadStudentData(students[0]);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadStudentData = async (student) => {
    // Get conversations
    const allConversations = await base44.entities.Conversation.filter({ 
      student_id: student.id 
    });
    
    const sortedConversations = allConversations.sort((a, b) => 
      new Date(b.last_message_date || b.created_date) - new Date(a.last_message_date || a.created_date)
    );
    
    setConversations(sortedConversations);

    // Get assigned teachers for new chat
    if (student.assigned_teachers?.length > 0) {
      const teacherIds = [...new Set(student.assigned_teachers.map(at => at.teacher_id))];
      const allTeachers = await base44.entities.Teacher.list();
      const assignedTeachers = allTeachers.filter(t => teacherIds.includes(t.id));
      
      // Filter out teachers we already have conversations with
      const existingTeacherIds = allConversations.map(c => c.teacher_id);
      const available = assignedTeachers.filter(t => !existingTeacherIds.includes(t.id));
      
      setAvailableContacts(available);
    }
  };

  const loadTeacherData = async (teacher) => {
    // Get conversations
    const allConversations = await base44.entities.Conversation.filter({ 
      teacher_id: teacher.id 
    });
    
    const sortedConversations = allConversations.sort((a, b) => 
      new Date(b.last_message_date || b.created_date) - new Date(a.last_message_date || a.created_date)
    );
    
    setConversations(sortedConversations);

    // Get students for new chat (from bookings)
    const allBookings = await base44.entities.Booking.filter({ 
      teacher_id: teacher.id 
    });
    
    const studentIds = [...new Set(allBookings.map(b => b.student_id))];
    const allStudents = [];
    
    for (const studentId of studentIds) {
      const students = await base44.entities.Student.filter({ id: studentId });
      if (students.length > 0) {
        allStudents.push(students[0]);
      }
    }
    
    // Filter out students we already have conversations with
    const existingStudentIds = allConversations.map(c => c.student_id);
    const available = allStudents.filter(s => !existingStudentIds.includes(s.id));
    
    setAvailableContacts(available);
  };

  const handleCreateConversation = async () => {
    if (!selectedContact) return;

    setCreating(true);
    try {
      const contact = availableContacts.find(c => c.id === selectedContact);
      
      let conversationData;
      if (userRole === 'student') {
        conversationData = {
          student_id: userProfile.id,
          student_name: userProfile.full_name,
          student_email: user.email,
          teacher_id: contact.id,
          teacher_name: contact.full_name,
          teacher_email: contact.user_email,
          unread_count_student: 0,
          unread_count_teacher: 0
        };
      } else {
        conversationData = {
          student_id: contact.id,
          student_name: contact.full_name,
          student_email: contact.user_email,
          teacher_id: userProfile.id,
          teacher_name: userProfile.full_name,
          teacher_email: user.email,
          unread_count_student: 0,
          unread_count_teacher: 0
        };
      }

      const newConversation = await base44.entities.Conversation.create(conversationData);
      
      setShowNewChat(false);
      setSelectedContact('');
      await loadData();
      setSelectedConversation(newConversation);
    } catch (error) {
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  const filteredConversations = conversations.filter(c => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const name = userRole === 'student' ? c.teacher_name : c.student_name;
    return name?.toLowerCase().includes(query);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-[#41f2c0]" size={40} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-4">
          <h1 className="text-lg sm:text-3xl font-bold text-[#404040]">Mensajes</h1>
          <p className="text-gray-500 mt-2 text-sm">
            {userRole === 'student' 
              ? 'Chatea con tus profesores' 
              : 'Chatea con tus alumnos'}
          </p>
        </div>
        {availableContacts.length > 0 && (
          <Button
            onClick={() => setShowNewChat(true)}
            className="w-full sm:w-auto bg-[#41f2c0] hover:bg-[#35d4a7] text-white"
          >
            <Plus size={18} className="mr-2" />
            Nueva conversación
          </Button>
        )}
      </div>

      {/* Chat Interface */}
      <Card className="h-full overflow-hidden messages-list">
        <div className="flex flex-col md:flex-row h-full">
          {/* Conversations List */}
          <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} w-full md:w-80 border-r border-gray-100 flex-col bg-gray-50`}>
            <div className="p-4 border-b border-gray-100 bg-white">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  placeholder="Buscar conversaciones..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {filteredConversations.length > 0 ? (
                <ConversationList
                  conversations={filteredConversations}
                  selectedConversation={selectedConversation}
                  onSelectConversation={setSelectedConversation}
                  userRole={userRole}
                />
              ) : (
                <div className="text-center py-12">
                  <MessageCircle className="mx-auto text-gray-300 mb-4" size={48} />
                  <p className="text-gray-500 text-sm">
                    {searchQuery 
                      ? 'No se encontraron conversaciones'
                      : 'No tienes conversaciones aún'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Chat Window */}
          <ChatWindow
            conversation={selectedConversation}
            userRole={userRole}
            userId={userProfile?.id}
            onMessageSent={loadData}
          />
        </div>
      </Card>

      {/* New Conversation Dialog */}
      <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva conversación</DialogTitle>
            <DialogDescription>
              Selecciona {userRole === 'student' ? 'un profesor' : 'un alumno'} para comenzar a chatear
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Select value={selectedContact} onValueChange={setSelectedContact}>
              <SelectTrigger>
                <SelectValue placeholder={`Seleccionar ${userRole === 'student' ? 'profesor' : 'alumno'}`} />
              </SelectTrigger>
              <SelectContent>
                {availableContacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {contact.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowNewChat(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateConversation}
              disabled={!selectedContact || creating}
              className="bg-[#41f2c0] hover:bg-[#35d4a7] text-white"
            >
              {creating ? <Loader2 className="animate-spin" /> : 'Crear conversación'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}