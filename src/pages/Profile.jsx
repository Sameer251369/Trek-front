import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield, Sparkles, Phone, Award, Edit3, CheckCircle, Lock,
  Camera, X, Image, Upload,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usersAPI, authAPI } from '../api';

export default function Profile() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const loggedInUser = authAPI.getCurrentUser();
  const isOwnProfile = loggedInUser && String(loggedInUser.id) === String(id);

  // Form Edit fields
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState('');
  const [experience, setExperience] = useState('BEGINNER');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState(null);
  const [removePicture, setRemovePicture] = useState(false);

  // Public post fields
  const [postImage, setPostImage] = useState(null);
  const [postCaption, setPostCaption] = useState('');

  // Queries
  const { data: userProfile, isLoading, isError } = useQuery({
    queryKey: ['profile', id],
    queryFn: () => usersAPI.getProfile(id),
  });

  // Dynamically fetch all defined achievements from the system
  const { data: globalAchievements = [], isLoading: isLoadingAchievements } = useQuery({
    queryKey: ['achievements'],
    queryFn: usersAPI.listAchievements,
  });

  // Comprehensive clean up on preview changes or unmounting
  useEffect(() => {
    return () => {
      if (profilePicturePreview) {
        URL.revokeObjectURL(profilePicturePreview);
      }
    };
  }, [profilePicturePreview]);

  // Clean up when leaving edit mode explicitly and initialize fields
  const toggleEditMode = () => {
    if (isEditing) {
      if (profilePicturePreview) {
        URL.revokeObjectURL(profilePicturePreview);
      }
      setProfilePicture(null);
      setProfilePicturePreview(null);
      setRemovePicture(false);
    } else {
      // ENTERING edit mode - safely populate input values
      if (userProfile?.profile) {
        setBio(userProfile.profile.bio || '');
        setExperience(userProfile.profile.experience_level || 'BEGINNER');
        setEmergencyName(userProfile.profile.emergency_contact_name || '');
        setEmergencyPhone(userProfile.profile.emergency_contact_phone || '');
      }
    }
    setIsEditing(!isEditing);
  };

  // Mutations
  const updateProfileMutation = useMutation({
    mutationFn: usersAPI.updateProfile,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['profile', id] });
      setIsEditing(false);
      setSaveSuccess(true);
      setProfilePicture(null);
      setProfilePicturePreview(null);
      setRemovePicture(false);
      setTimeout(() => setSaveSuccess(false), 3000);

      const stored = authAPI.getCurrentUser();
      if (stored) {
        stored.profile = data.profile;
        localStorage.setItem('user', JSON.stringify(stored));
      }
      window.dispatchEvent(new Event('userUpdated'));
    },
  });

  const createPostMutation = useMutation({
    mutationFn: usersAPI.createProfilePost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', id] });
      setPostImage(null);
      setPostCaption('');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (isError || !userProfile) {
    return (
      <div className="p-8 text-center bg-red-500/[0.03] border border-red-500/20 text-red-400 font-mono text-xs uppercase">
        SYS_ERR // Failed to load profile registry. Check coordinates.
      </div>
    );
  }

  const handleSave = (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('bio', bio);
    formData.append('experience_level', experience);
    formData.append('emergency_contact_name', emergencyName);
    formData.append('emergency_contact_phone', emergencyPhone);

    if (profilePicture) {
      formData.append('profile_picture', profilePicture);
    }
    if (removePicture) {
      formData.append('remove_profile_picture', 'true');
    }

    updateProfileMutation.mutate(formData);
  };

  const handlePictureChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (profilePicturePreview) {
        URL.revokeObjectURL(profilePicturePreview);
      }
      setProfilePicture(file);
      setProfilePicturePreview(URL.createObjectURL(file));
      setRemovePicture(false);
    }
  };

  const handleRemovePicture = () => {
    if (profilePicturePreview) {
      URL.revokeObjectURL(profilePicturePreview);
    }
    setProfilePicture(null);
    setProfilePicturePreview(null);
    setRemovePicture(true);
  };

  const handlePostSubmit = (e) => {
    e.preventDefault();
    if (!postImage) return;

    const formData = new FormData();
    formData.append('image', postImage);
    formData.append('caption', postCaption);

    createPostMutation.mutate(formData);
  };

  const avatarUrl = removePicture
    ? null
    : profilePicturePreview || userProfile.profile?.profile_picture_url;

  const earnedAchievementNames = (userProfile.achievements || []).map(ach => ach.achievement?.name);
  const workshopsCreated = userProfile.profile?.workshops_created_count || 0;
  const workshopsParticipated = userProfile.profile?.workshops_participated_count || 0;
  const posts = userProfile.posts || [];

  return (
    <div className="max-w-4xl mx-auto space-y-8 font-mono text-xs text-left">
      {/* Top Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-none bg-[#0A0A0C] border border-[#1C1C1E] p-6 sm:p-8 flex flex-col md:flex-row gap-6 items-start justify-between relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
      >
        <div className="flex flex-col sm:flex-row gap-5 items-center relative z-10 w-full md:w-auto">
          <div className="relative shrink-0 w-20 h-20 bg-[#000000] border border-[#1C1C1E] rounded-none overflow-hidden">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={userProfile.username}
                className="w-full h-full object-cover block rounded-none"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-primary text-3xl font-bold bg-[#111] rounded-none">
                {userProfile.username?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            {isOwnProfile && isEditing && (
              <label className="absolute inset-0 flex items-center justify-center bg-black/60 text-primary cursor-pointer hover:bg-black/80 transition duration-150 rounded-none">
                <Camera className="w-5 h-5" />
                <input type="file" accept="image/*" className="hidden" onChange={handlePictureChange} />
              </label>
            )}
          </div>

          <div className="text-center sm:text-left space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <h1 className="text-lg font-bold text-dark-text uppercase tracking-wider font-sans">{userProfile.username}</h1>
              <span className="text-[9px] font-bold px-2 py-0.5 border border-primary/20 bg-primary/5 text-primary uppercase tracking-wider self-center sm:self-auto">
                {userProfile.profile?.experience_level || 'Beginner'}
              </span>
            </div>

            <p className="text-dark-muted leading-relaxed max-w-md font-sans text-[11px]">
              {userProfile.profile?.bio || "No biography registered. Modify settings to establish link description."}
            </p>

            <div className="flex items-center gap-4 text-[10px] text-dark-muted pt-2 justify-center sm:justify-start flex-wrap font-mono uppercase tracking-tight">
              <div>
                [ COMPLETED: <span className="text-primary font-bold">{userProfile.profile?.previous_treks_completed || 0}</span> ]
              </div>
              <div>
                [ MEMBER: <span className="text-primary font-bold">{workshopsParticipated}</span> ]
              </div>
              <div>
                [ LEAD: <span className="text-primary font-bold">{workshopsCreated}</span> ]
              </div>
              <div>
                [ RATING: <span className="text-primary font-bold">{userProfile.profile?.rating || '5.0'}</span> ]
              </div>
            </div>
          </div>
        </div>

        {isOwnProfile && (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={toggleEditMode}
            className="relative z-10 w-full md:w-auto py-2.5 px-4 rounded-none bg-[#000000] hover:bg-[#E8FF00]/5 text-dark-text hover:text-primary font-bold border border-[#1C1C1E] transition duration-150 uppercase tracking-wider flex items-center justify-center gap-2 mt-4 md:mt-0 shrink-0"
          >
            {isEditing ? <X className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
            <span>{isEditing ? 'Cancel Edit' : 'Edit Profile'}</span>
          </motion.button>
        )}
      </motion.div>

      <AnimatePresence>
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="p-4 bg-primary/10 border border-primary/30 text-primary text-xs uppercase tracking-wider flex items-center gap-2 rounded-none"
          >
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>Profile settings compiled successfully.</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          {isEditing ? (
            <form onSubmit={handleSave} className="border border-[#1C1C1E] bg-[#0A0A0C] p-6 space-y-4 rounded-none shadow-[0_15px_40px_rgba(0,0,0,0.6)]">
              <h2 className="text-xs font-bold text-dark-text border-b border-[#1C1C1E] pb-3 mb-4 uppercase tracking-widest">Edit Profile Settings</h2>

              {(avatarUrl || profilePicture) && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleRemovePicture}
                    className="text-[10px] font-bold text-red-400 hover:text-red-300 flex items-center gap-1 uppercase"
                  >
                    <X className="w-3 h-3" />
                    [ Remove profile picture ]
                  </button>
                </div>
              )}

              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-dark-muted mb-1.5">[01] Biography Description</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="I love weekend hikes and high-altitude climbs..."
                  rows="3"
                  className="w-full p-3.5 bg-[#000000] border border-[#1C1C1E] text-dark-text focus:outline-none focus:border-primary transition-colors placeholder:text-dark-muted-dim rounded-none font-sans text-xs resize-none"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-dark-muted mb-1.5">[02] Experience Level</label>
                <select
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  className="w-full p-3.5 bg-[#000000] border border-[#1C1C1E] text-dark-text focus:outline-none focus:border-primary transition-colors rounded-none"
                >
                  <option value="BEGINNER">BEGINNER</option>
                  <option value="INTERMEDIATE">INTERMEDIATE</option>
                  <option value="EXPERT">EXPERT</option>
                </select>
              </div>

              <div className="border-t border-[#1C1C1E]/55 pt-4 mt-6">
                <h3 className="text-xs font-bold text-dark-text mb-3 flex items-center gap-1.5 uppercase tracking-widest">
                  <Shield className="w-4 h-4 text-primary" />
                  <span>Emergency SOS Contact Details</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-dark-muted mb-1.5">[03] Contact Name</label>
                    <input
                      type="text"
                      value={emergencyName}
                      onChange={(e) => setEmergencyName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full p-3.5 bg-[#000000] border border-[#1C1C1E] text-dark-text focus:outline-none focus:border-primary transition-colors placeholder:text-dark-muted-dim rounded-none font-sans text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-dark-muted mb-1.5">[04] Contact Phone</label>
                    <input
                      type="text"
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                      placeholder="+91 9876543210"
                      className="w-full p-3.5 bg-[#000000] border border-[#1C1C1E] text-dark-text focus:outline-none focus:border-primary transition-colors placeholder:text-dark-muted-dim rounded-none"
                    />
                  </div>
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={updateProfileMutation.isPending}
                className="w-full sm:w-auto px-6 py-3 bg-primary hover:bg-primary-hover text-dark-bg font-bold transition duration-150 mt-4 rounded-none uppercase tracking-wider"
              >
                {updateProfileMutation.isPending ? 'SAVING...' : 'SAVE SETTINGS'}
              </motion.button>
            </form>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="border border-[#1C1C1E] bg-[#0A0A0C] p-6 space-y-6 rounded-none shadow-[0_15px_40px_rgba(0,0,0,0.6)]"
            >
              <div>
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-dark-muted mb-3 border-b border-[#1C1C1E] pb-1.5">SYS // ABOUT</h2>
                <p className="text-dark-text leading-relaxed font-sans text-[13px]">
                  {userProfile.profile?.bio || "No description provided."}
                </p>
              </div>

              {userProfile.profile?.emergency_contact_name && (
                <div className="border-t border-[#1C1C1E] pt-5">
                  <h3 className="text-xs font-bold text-dark-text mb-3 flex items-center gap-1.5 uppercase tracking-widest">
                    <Shield className="w-4 h-4 text-primary" />
                    <span>Emergency SOS Contacts</span>
                  </h3>
                  <div className="p-4 bg-[#000000] border border-[#1C1C1E] flex items-center gap-3 rounded-none">
                    <div className="p-2 bg-primary/15 text-primary rounded-none border border-primary/20">
                      <Phone className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <p className="font-bold text-dark-text uppercase">{userProfile.profile.emergency_contact_name}</p>
                      <p className="text-xs text-dark-muted font-mono">{userProfile.profile.emergency_contact_phone}</p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Public Posts Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="border border-[#1C1C1E] bg-[#0A0A0C] p-6 space-y-5 rounded-none shadow-[0_15px_40px_rgba(0,0,0,0.6)]"
          >
            <h2 className="text-xs font-bold uppercase tracking-widest text-dark-muted flex items-center gap-2 border-b border-[#1C1C1E] pb-2">
              <Image className="w-4 h-4 text-primary" />
              <span>Public Posts ({posts.length})</span>
            </h2>

            {isOwnProfile && (
              <form onSubmit={handlePostSubmit} className="grid gap-3 p-4 bg-[#000000] border border-[#1C1C1E] rounded-none">
                <label className="flex flex-col items-center justify-center gap-2 min-h-24 border border-dashed border-[#1C1C1E] text-dark-muted hover:border-primary hover:text-primary cursor-pointer transition-colors rounded-none p-3">
                  <Upload className="w-4 h-4 text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-center">
                    {postImage ? postImage.name : 'Upload post photo'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setPostImage(e.target.files?.[0] || null)}
                  />
                </label>
                <textarea
                  value={postCaption}
                  onChange={(e) => setPostCaption(e.target.value)}
                  placeholder="Add details / caption sequence..."
                  rows="2"
                  className="w-full p-3 bg-[#0A0A0C] border border-[#1C1C1E] text-dark-text focus:outline-none focus:border-primary transition-colors placeholder:text-dark-muted-dim rounded-none font-sans text-xs resize-none"
                />
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={!postImage || createPostMutation.isPending}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-dark-bg font-bold transition duration-150 uppercase tracking-widest rounded-none text-[10px]"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {createPostMutation.isPending ? 'POSTING...' : 'PUBLISH POST'}
                </motion.button>
              </form>
            )}

            {posts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {posts.map((post, index) => (
                  <motion.article
                    key={post.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.3) }}
                    className="border border-[#1C1C1E] bg-[#000000] overflow-hidden rounded-none flex flex-col"
                  >
                    <img
                      src={post.image_url}
                      alt={post.caption || `${userProfile.username} post`}
                      className="w-full aspect-square object-cover filter grayscale hover:grayscale-0 transition duration-300"
                    />
                    {post.caption && (
                      <p className="p-3 text-xs text-dark-text leading-relaxed font-sans border-t border-[#1C1C1E] bg-[#0A0A0C] flex-1">
                        {post.caption}
                      </p>
                    )}
                  </motion.article>
                ))}
              </div>
            ) : (
              <div className="p-5 border border-[#1C1C1E] bg-[#000000] text-dark-muted text-center italic rounded-none font-sans text-[11px]">
                No public logs uploaded yet.
              </div>
            )}
          </motion.div>
        </div>

        {/* Right Column: Achievements */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="border border-[#1C1C1E] bg-[#0A0A0C] p-6 shadow-[0_15px_40px_rgba(0,0,0,0.6)] rounded-none text-left"
          >
            <h2 className="text-xs font-bold uppercase tracking-widest text-dark-muted mb-4 flex items-center gap-2 border-b border-[#1C1C1E] pb-2">
              <Award className="w-4 h-4 text-primary" />
              <span>Achievements ({userProfile.achievements?.length || 0})</span>
            </h2>

            {isLoadingAchievements ? (
              <div className="flex items-center justify-center py-6">
                <div className="w-6 h-6 border border-primary border-t-transparent animate-spin animate-spin-slow" />
              </div>
            ) : (
              <div className="space-y-4">
                {globalAchievements.map((ach, index) => {
                  const isEarned = earnedAchievementNames.includes(ach.name);
                  return (
                    <motion.div
                      key={ach.id || ach.name}
                      initial={{ opacity: 0, x: 5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.25, delay: index * 0.05 }}
                      className={`p-4 border flex gap-3.5 transition duration-150 relative rounded-none ${isEarned
                          ? 'border-primary/20 bg-primary/5 text-dark-text shadow-sm shadow-primary/5'
                          : 'border-[#1C1C1E] bg-[#000000] text-dark-muted'
                        }`}
                    >
                      <div className={`w-10 h-10 flex items-center justify-center border shrink-0 rounded-none ${isEarned
                          ? 'bg-primary/10 border-primary/30 text-primary'
                          : 'bg-[#111] border-[#1C1C1E]/60 text-dark-muted/40'
                        }`}>
                        {isEarned ? <Sparkles className="w-5 h-5" /> : <Lock className="w-4 h-4 text-dark-muted/20" />}
                      </div>

                      <div className="space-y-0.5 text-left min-w-0 flex-1">
                        <h3 className={`font-bold text-xs leading-tight uppercase truncate ${isEarned ? 'text-primary' : 'text-dark-muted'}`}>
                          {ach.name}
                        </h3>
                        <p className="text-[10px] text-dark-muted leading-relaxed font-sans mt-0.5">
                          {ach.description || ach.desc}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
                {globalAchievements.length === 0 && (
                  <div className="text-[10px] text-dark-muted text-center py-4 font-sans italic">
                    No achievements available in database.
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}