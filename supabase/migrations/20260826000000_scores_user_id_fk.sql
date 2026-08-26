alter table scores
  add constraint scores_user_id_fkey
  foreign key (user_id) references auth.users(id);
