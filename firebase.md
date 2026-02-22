
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // --- USER DATA & JOURNAL ---
    match /users/{userId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.auth.uid == userId;
      allow update: if request.auth != null && request.auth.uid == userId &&
                    (
                      !request.resource.data.diff(resource.data).affectedKeys().hasAny(['role']) || 
                      request.resource.data.role == resource.data.role
                    );
      
      match /journal/{entryId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }

    // --- PUBLISHED CONTENT (Read-Only for Users) ---
    match /published_ebooks/{ebookId} {
      allow read: if true;
      allow write: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'central admin';
    }
    match /published_exam_qsts/{examId} {
      allow read: if true;
      allow write: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'central admin';
    }
    match /published_videos/{videoId} {
      allow read: if true;
      allow write: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'central admin';
    }
    
    // --- DRAFTS & ADMIN ---
    match /drafts/{draftId} {
      allow read, write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'central admin';
    }
    match /announcements/{announcementId} {
      allow read: if true;
      allow write: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'central admin';
    }
    match /notifications/{notificationId} {
      allow read: if request.auth != null;
      allow write: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'central admin';
    }
    match /settings/{settingId} {
      allow read: if true;
      allow write: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'central admin';
    }
    match /contact_submissions/{submissionId} {
      allow create: if true;
      allow read: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'central admin';
    }

    // --- GAME & ARCADE ---
    match /game_levels/{levelId} {
      allow read: if true;
      allow write: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'central admin';
    }
    
    // --- COMMUNITY & SOCIAL ---
    match /community_questions/{questionId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update: if request.auth != null; // For likes, answers, and poll votes
      // ALLOW ADMIN DELETION OR AUTHOR DELETION
      allow delete: if request.auth != null && (
        resource.data.authorId == request.auth.uid || 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'central admin'
      );

      match /answers/{answerId} {
        allow read: if true;
        allow create: if request.auth != null;
      }
      match /attempts/{userId} {
        allow read, write: if request.auth != null;
      }
    }

    // --- DEBATES (New) ---
    match /debates/{weekId} {
      allow read: if true;
      allow write: if request.auth != null; // Allows voting
    }

    // --- BATTLES (New) ---
    match /battle_requests/{requestId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null; // For accepting/rejecting
    }
    match /battles/{battleId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null; // For score updates
    }

    // --- UTILITIES ---
    match /image_queue/{taskId} {
      allow read, write: if request.auth != null;
    }
    match /payment_tokens/{tokenId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null;
    }
  }
}
