import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield, Sparkles, Phone, Award, Edit3, Save, CheckCircle, Lock,
  Camera, X, Image, Upload,
} from 'lucide-react';
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

  // Keep state synced when userProfile changes
  useEffect(() => {
    if (userProfile?.profile) {
      setBio(userProfile.profile.bio || '');
      setExperience(userProfile.profile.experience_level || 'BEGINNER');
      setEmergencyName(userProfile.profile.emergency_contact_name || '');
      setEmergencyPhone(userProfile.profile.emergency_contact_phone || '');
    }
  }, [userProfile]);

  // Comprehensive clean up on preview changes or unmounting
  useEffect(() => {
    return () => {
      if (profilePicturePreview) {
        URL.revokeObjectURL(profilePicturePreview);
      }
    };
  }, [profilePicturePreview]);

  // Clean up when leaving edit mode explicitly
  const toggleEditMode = () => {
    if (isEditing) {
      // Clear unsaved file states and object URLs
      if (profilePicturePreview) {
        URL.revokeObjectURL(profilePicturePreview);
      }
      setProfilePicture(null);
      setProfilePicturePreview(null);
      setRemovePicture(false);
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
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isError || !userProfile) {
    return (
      <div className="p-8 text-center glass-panel rounded-xl border border-red-500/20 text-red-400">
        <p>Failed to load profile. Please verify this user exists.</p>
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

  const globalAchievements = [
    { name: "First Trek", desc: "Completed your first trekking expedition.", icon: "Compass" },
    { name: "Mountain Explorer", desc: "Completed 5 trekking expeditions.", icon: "Compass" },
    { name: "Night Trekker", desc: "Successfully survived a night-hiking expedition.", icon: "Compass" },
    { name: "Summit Legend", desc: "Hiked over 100km or completed 10+ expeditions.", icon: "Compass" }
  ];

  const earnedAchievementNames = (userProfile.achievements || []).map(ach => ach.achievement?.name);
  const workshopsCreated = userProfile.profile?.workshops_created_count || 0;
  const workshopsParticipated = userProfile.profile?.workshops_participated_count || 0;
  const posts = userProfile.posts || [];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Top Profile Card */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-dark-border/30 bg-gradient-to-br from-dark-card to-dark-bg flex flex-col md:flex-row gap-6 items-start justify-between relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row gap-5 items-center">
          <div className="relative shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={userProfile.username}
                className="w-20 h-20 rounded-full border-2 border-primary object-cover shadow-lg shadow-primary/10"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center text-primary text-3xl font-bold shadow-lg shadow-primary/10">
                {userProfile.username?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            {isOwnProfile && isEditing && (
              <label className="absolute -bottom-1 -right-1 p-1.5 bg-primary text-dark-bg rounded-full cursor-pointer shadow-md hover:bg-primary-hover transition">
                <Camera className="w-4 h-4" />
                <input type="file" accept="image/*" className="hidden" onChange={handlePictureChange} />
              </label>
            )}
          </div>

          <div className="text-center sm:text-left space-y-1.5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h1 className="text-2xl font-bold text-dark-text tracking-tight">{userProfile.username}</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-primary/20 bg-primary/10 text-primary uppercase tracking-wider self-center sm:self-auto">
                {userProfile.profile?.experience_level || 'Beginner'}
              </span>
            </div>

            <p className="text-dark-muted text-sm max-w-md">
              {userProfile.profile?.bio || "No biography provided. Add something to introduce yourself to your fellow trekkers!"}
            </p>

            <div className="flex items-center gap-6 text-xs text-dark-muted pt-2 justify-center sm:justify-start flex-wrap">
              <div>
                <span className="text-primary font-extrabold text-sm">{userProfile.profile?.previous_treks_completed || 0}</span> Completed
              </div>
              <div className="w-[1px] h-3 bg-dark-border" />
              <div>
                <span className="text-primary font-extrabold text-sm">{workshopsParticipated}</span> Participated
              </div>
              <div className="w-[1px] h-3 bg-dark-border" />
              <div>
                <span className="text-primary font-extrabold text-sm">{workshopsCreated}</span> Created
              </div>
              <div className="w-[1px] h-3 bg-dark-border" />
              <div>
                <span className="text-primary font-extrabold text-sm">{userProfile.profile?.rating || '5.0'}</span> Rating
              </div>
            </div>
          </div>
        </div>

        {isOwnProfile && (
          <button
            onClick={toggleEditMode}
            className="w-full md:w-auto py-2.5 px-5 bg-dark-border/40 hover:bg-dark-border text-dark-text font-bold rounded-lg border border-dark-border/50 transition duration-200 text-sm flex items-center justify-center gap-2 mt-4 md:mt-0 shrink-0"
          >
            {isEditing ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            <span>{isEditing ? 'Cancel Edit' : 'Edit Profile'}</span>
          </button>
        )}
      </div>

      {saveSuccess && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-300 text-sm flex items-center gap-2">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>Profile information saved successfully.</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          {isEditing ? (
            <form onSubmit={handleSave} className="glass-panel p-6 rounded-xl border border-dark-border/30 space-y-4 text-sm">
              <h2 className="text-lg font-bold text-dark-text border-b border-dark-border/30 pb-3 mb-4">Edit Profile Information</h2>

              {(avatarUrl || profilePicture) && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleRemovePicture}
                    className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    Remove profile picture
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-dark-muted mb-1.5">Biography</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="I love weekend hikes and high-altitude climbs..."
                  rows="3"
                  className="w-full p-2.5 rounded-lg glass-input text-dark-text"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-dark-muted mb-1.5">Trekking Experience Level</label>
                <select
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-dark-bg border border-dark-border text-dark-text"
                >
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="EXPERT">Expert</option>
                </select>
              </div>

              <div className="border-t border-dark-border/30 pt-4 mt-6">
                <h3 className="text-sm font-bold text-dark-text mb-3 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-primary" />
                  <span>Emergency SOS Contact Details</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-dark-muted mb-1.5">Contact Name</label>
                    <input
                      type="text"
                      value={emergencyName}
                      onChange={(e) => setEmergencyName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full p-2.5 rounded-lg glass-input text-dark-text"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-dark-muted mb-1.5">Contact Phone Number</label>
                    <input
                      type="text"
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                      placeholder="+91 9876543210"
                      className="w-full p-2.5 rounded-lg glass-input text-dark-text"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={updateProfileMutation.isPending}
                className="w-full sm:w-auto px-6 py-2.5 bg-primary hover:bg-primary-hover text-dark-bg font-extrabold rounded-lg transition duration-200 shadow-md shadow-primary/10 mt-4 text-xs"
              >
                {updateProfileMutation.isPending ? 'Saving...' : 'Save Settings'}
              </button>
            </form>
          ) : (
            <div className="glass-panel p-6 rounded-xl border border-dark-border/30 space-y-6 text-sm">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-dark-muted mb-3">About</h2>
                <p className="text-dark-text leading-relaxed">
                  {userProfile.profile?.bio || "No description provided."}
                </p>
              </div>

              {userProfile.profile?.emergency_contact_name && (
                <div className="border-t border-dark-border/20 pt-5">
                  <h3 className="text-sm font-bold text-dark-text mb-3 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-primary" />
                    <span>Emergency SOS Contacts</span>
                  </h3>
                  <div className="p-4 rounded-lg bg-dark-bg border border-dark-border/40 flex items-center gap-3">
                    <div className="p-2 bg-primary/10 text-primary rounded-lg">
                      <Phone className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <p className="font-semibold text-dark-text">{userProfile.profile.emergency_contact_name}</p>
                      <p className="text-xs text-dark-muted">{userProfile.profile.emergency_contact_phone}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Public Posts Section */}
          <div className="glass-panel p-6 rounded-xl border border-dark-border/30 space-y-5 text-sm">
            <h2 className="text-sm font-bold uppercase tracking-widest text-dark-muted flex items-center gap-2">
              <Image className="w-4 h-4 text-primary" />
              <span>Public Posts ({posts.length})</span>
            </h2>

            {isOwnProfile && (
              <form onSubmit={handlePostSubmit} className="grid gap-3 p-4 rounded-lg bg-dark-bg border border-dark-border/40">
                <label className="flex items-center justify-center gap-2 min-h-28 rounded-lg border border-dashed border-dark-border/60 text-dark-muted hover:border-primary hover:text-primary cursor-pointer transition-colors">
                  <Upload className="w-4 h-4" />
                  <span className="text-xs font-semibold">
                    {postImage ? postImage.name : 'Upload post image'}
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
                  placeholder="Add a caption..."
                  rows="2"
                  className="w-full p-2.5 rounded-lg glass-input text-dark-text"
                />
                <button
                  type="submit"
                  disabled={!postImage || createPostMutation.isPending}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-dark-bg font-extrabold rounded-lg transition duration-200 text-xs disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {createPostMutation.isPending ? 'Posting...' : 'Post'}
                </button>
              </form>
            )}

            {posts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {posts.map((post) => (
                  <article key={post.id} className="rounded-lg border border-dark-border/40 bg-dark-bg overflow-hidden">
                    <img
                      src={post.image_url}
                      alt={post.caption || `${userProfile.username} profile post`}
                      className="w-full aspect-square object-cover"
                    />
                    {post.caption && (
                      <p className="p-3 text-sm text-dark-text leading-relaxed">
                        {post.caption}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className="p-5 rounded-lg border border-dark-border/40 bg-dark-bg text-dark-muted text-sm">
                No public posts yet.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Achievements */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-xl border border-dark-border/30">
            <h2 className="text-sm font-bold uppercase tracking-widest text-dark-muted mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              <span>Achievements ({userProfile.achievements?.length || 0})</span>
            </h2>

            <div className="space-y-4">
              {globalAchievements.map((ach) => {
                const isEarned = earnedAchievementNames.includes(ach.name);
                return (
                  <div
                    key={ach.name}
                    className={`p-4 rounded-xl border flex gap-3.5 transition duration-300 relative ${
                      isEarned
                        ? 'border-primary/20 bg-primary/5 text-dark-text shadow-sm shadow-primary/5'
                        : 'border-dark-border/30 bg-dark-card/20 text-dark-muted'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border shrink-0 ${
                      isEarned
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'bg-dark-border/20 border-dark-border/40 text-dark-muted/40'
                    }`}>
                      {isEarned ? <Sparkles className="w-6 h-6" /> : <Lock className="w-5 h-5" />}
                    </div>

                    <div className="space-y-0.5 text-left">
                      <h3 className={`font-bold text-sm leading-tight ${isEarned ? 'text-dark-text' : 'text-dark-muted'}`}>
                        {ach.name}
                      </h3>
                      <p className="text-xs text-dark-muted leading-relaxed">
                        {ach.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}