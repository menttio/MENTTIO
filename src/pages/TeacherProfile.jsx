import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { 
  ArrowLeft,
  Star,
  Calendar,
  Award,
  BookOpen,
  Languages,
  GraduationCap,
  Briefcase,
  Edit,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import EditTeacherProfileDialog from '../components/teacher/EditTeacherProfileDialog';

export default function TeacherProfile() {
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      const teachers = await base44.entities.Teacher.filter({ user_email: user.email });
      
      if (teachers.length > 0) {
        setTeacher(teachers[0]);
        
        const allReviews = await base44.entities.Review.filter({ teacher_id: teachers[0].id });
        setReviews(allReviews.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-[#41f2c0]" size={40} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-[#404040]">Mi Perfil</h1>
          <p className="text-gray-500 mt-1">Gestiona tu información profesional</p>
        </div>
        <Button
          onClick={() => setShowEditDialog(true)}
          className="bg-[#41f2c0] hover:bg-[#35d4a7] text-white"
        >
          <Edit size={16} className="mr-2" />
          Editar Perfil
        </Button>
      </div>

      {/* Profile Header */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-[#41f2c0] to-[#35d4a7] flex items-center justify-center flex-shrink-0">
              {teacher.profile_photo ? (
                <img 
                  src={teacher.profile_photo} 
                  alt={teacher.full_name}
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                <span className="text-5xl text-white font-bold">
                  {teacher.full_name?.charAt(0)}
                </span>
              )}
            </div>

            <div className="flex-1">
              <h2 className="text-2xl font-bold text-[#404040] mb-2">{teacher.full_name}</h2>
              
              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-1">
                  <Star className="text-yellow-400 fill-yellow-400" size={18} />
                  <span className="font-semibold">{teacher.rating?.toFixed(1) || '5.0'}</span>
                  <span className="text-gray-500 text-sm">({reviews.length} reseñas)</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <Calendar size={16} />
                  <span className="text-sm">{teacher.total_classes || 0} clases impartidas</span>
                </div>
              </div>

              {teacher.bio && (
                <p className="text-gray-600 mb-4">{teacher.bio}</p>
              )}

              <div className="flex flex-wrap gap-2">
                {teacher.subjects?.map((subject, idx) => (
                  <Badge key={idx} className="bg-[#41f2c0]/10 text-[#404040] hover:bg-[#41f2c0]/20">
                    {subject.subject_name} - {subject.price_per_hour}€/h
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Content */}
      <Tabs defaultValue="about">
        <TabsList className="mb-6">
          <TabsTrigger value="about">Información</TabsTrigger>
          <TabsTrigger value="reviews">Reseñas ({reviews.length})</TabsTrigger>
        </TabsList>

        {/* About Tab */}
        <TabsContent value="about">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Experience */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Briefcase className="text-[#41f2c0]" size={24} />
                  <h3 className="font-semibold text-[#404040]">Experiencia</h3>
                </div>
                <p className="text-2xl font-bold text-[#41f2c0] mb-2">
                  {teacher.experience_years || 0} años
                </p>
                {teacher.education && (
                  <p className="text-gray-600 text-sm">{teacher.education}</p>
                )}
              </CardContent>
            </Card>

            {/* Teaching Methods */}
            {teacher.teaching_methods?.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <BookOpen className="text-[#41f2c0]" size={24} />
                    <h3 className="font-semibold text-[#404040]">Métodos de Enseñanza</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {teacher.teaching_methods.map((method, idx) => (
                      <Badge key={idx} variant="secondary">
                        {method}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Specializations */}
            {teacher.specializations?.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Award className="text-[#41f2c0]" size={24} />
                    <h3 className="font-semibold text-[#404040]">Especializaciones</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {teacher.specializations.map((spec, idx) => (
                      <Badge key={idx} className="bg-purple-100 text-purple-700">
                        {spec}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Languages */}
            {teacher.languages?.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Languages className="text-[#41f2c0]" size={24} />
                    <h3 className="font-semibold text-[#404040]">Idiomas</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {teacher.languages.map((lang, idx) => (
                      <Badge key={idx} variant="outline">
                        {lang}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Certifications */}
            {teacher.certifications?.length > 0 && (
              <Card className="md:col-span-2">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <GraduationCap className="text-[#41f2c0]" size={24} />
                    <h3 className="font-semibold text-[#404040]">Certificaciones y Títulos</h3>
                  </div>
                  <ul className="space-y-2">
                    {teacher.certifications.map((cert, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-gray-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#41f2c0]" />
                        {cert}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews">
          {reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((review, idx) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-[#404040]">{review.student_name}</h4>
                          <p className="text-xs text-gray-500">
                            {new Date(review.created_date).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              size={16}
                              className={
                                i < review.rating
                                  ? 'text-yellow-400 fill-yellow-400'
                                  : 'text-gray-300'
                              }
                            />
                          ))}
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-gray-600">{review.comment}</p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Star className="mx-auto text-gray-300 mb-4" size={48} />
                <p className="text-gray-500">Aún no tienes reseñas</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <EditTeacherProfileDialog
        teacher={teacher}
        open={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        onSave={loadData}
      />
    </div>
  );
}