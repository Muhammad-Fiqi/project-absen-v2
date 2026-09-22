/****************************************************
 * RUANG PTE - CLASSROOM CERTIFICATE AUTOMATION
 * VERSION: FIXED / ROBUST
 *
 * ALUR:
 * Google Classroom
 *      ↓
 * Hitung total assignedGrade siswa
 *      ↓
 * Jika total >= THRESHOLD
 *      ↓
 * Kirim email Google Form (1x saja)
 *      ↓
 * Siswa submit Form
 *      ↓
 * Validasi email + eligibility
 *      ↓
 * CERTIFICATE_QUEUE
 *      ↓
 * Autocrat (tahap berikutnya)
 *
 * PRASYARAT:
 * 1. Google Classroom API sudah ditambahkan:
 *    Apps Script → Services → Classroom API
 *
 * 2. Spreadsheet memiliki / akan dibuat:
 *    - STUDENTS
 *    - CERTIFICATE_QUEUE
 *
 * 3. Google Form memiliki pertanyaan:
 *    - Email
 *    - Nama Lengkap untuk Sertifikat
 *    - Program
 *
 * 4. Installable trigger untuk onCertificateFormSubmit:
 *    From spreadsheet → On form submit
 ****************************************************/


/**
 * ====================================================
 * KONFIGURASI
 * ====================================================
 */

const CONFIG = {
  SPREADSHEET_ID: '1d-SG9-PdsOtHsguK5dFAJNQARTXSYb5oKliNvx0IUOU',

  COURSE_ID: '872792240658',

  THRESHOLD: 1000,

  FORM_URL: 'https://forms.gle/zUtYkiGF32nDcuwV8',

  FORM_RESPONSE_SHEET: 'Form Responses 1',

  STUDENTS_SHEET: 'STUDENTS',

  QUEUE_SHEET: 'CERTIFICATE_QUEUE',

  ADMIN_EMAIL: 'ruangpte@gmail.com',
  NEXT_API_URL: 'https://98hps0bl-3000.asse.devtunnels.ms/api/integrations/google-classroom/sync',
  NEXT_API_SECRET: 'jiYSpEpZ0dDVSDgloX21bkZ6auKYfX/8+o+KXd+iWgs='
};


/**
 * ====================================================
 * SPREADSHEET
 * ====================================================
 */

/**
 * Membuka spreadsheet berdasarkan ID.
 * Jangan menggunakan getActiveSpreadsheet() untuk trigger.
 */
function getSS() {
  return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
}


/**
 * ====================================================
 * SETUP SHEET
 * ====================================================
 */

/**
 * Membuat / memastikan sheet STUDENTS tersedia.
 */
function getStudentDashboardSheet() {

  const ss = getSS();

  let sheet = ss.getSheetByName(CONFIG.STUDENTS_SHEET);

  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.STUDENTS_SHEET);
  }

  const headers = [
    'Classroom User ID',
    'Nama',
    'Email',
    'Total Poin',
    'Threshold',
    'Eligible',
    'Form Sent',
    'Form Submitted',
    'Certificate Generated',
    'Certificate Sent',
    'Last Checked'
  ];

  if (sheet.getLastRow() === 0) {

    sheet
      .getRange(1, 1, 1, headers.length)
      .setValues([headers]);

    sheet
      .getRange(1, 1, 1, headers.length)
      .setFontWeight('bold');

    sheet.setFrozenRows(1);
  }

  return sheet;
}


/**
 * Membuat / memastikan sheet CERTIFICATE_QUEUE tersedia.
 *
 * Sheet ini nantinya menjadi sumber data Autocrat.
 */
function getCertificateQueueSheet() {

  const ss = getSS();

  let sheet = ss.getSheetByName(CONFIG.QUEUE_SHEET);

  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.QUEUE_SHEET);
  }

  const headers = [
    'Timestamp',
    'Email',
    'Nama Sertifikat',
    'Program',
    'Tanggal',
    'Classroom User ID',
    'Total Poin',
    'Status'
  ];

  if (sheet.getLastRow() === 0) {

    sheet
      .getRange(1, 1, 1, headers.length)
      .setValues([headers]);

    sheet
      .getRange(1, 1, 1, headers.length)
      .setFontWeight('bold');

    sheet.setFrozenRows(1);
  }

  return sheet;
}


/**
 * Jalankan satu kali untuk membuat sheet yang diperlukan.
 */
function setupCertificateSystem() {

  getStudentDashboardSheet();
  getCertificateQueueSheet();

  console.log('Setup selesai.');
}


/**
 * ====================================================
 * CLASSROOM - STUDENTS
 * ====================================================
 */

function getAllStudents(courseId) {

  let students = [];
  let pageToken = null;

  do {

    const options = {
      pageSize: 100
    };

    if (pageToken) {
      options.pageToken = pageToken;
    }

    const response =
      Classroom.Courses.Students.list(
        courseId,
        options
      );

    const list = response.students || [];

    list.forEach(student => {

      const userId = student.userId;

      let name = 'Unknown Student';
      let email = '';
      let avatarUrl = '';

      if (student.profile) {

        if (student.profile.name) {
          name =
            student.profile.name.fullName ||
            name;
        }

        email =
          student.profile.emailAddress ||
          '';

        avatarUrl =
          student.profile.photoUrl ||
          '';
      }

      // Some Classroom API responses omit profile.photoUrl. Fetch the profile
      // directly so the leaderboard can still receive the Classroom avatar.
      if (!avatarUrl && userId) {
        try {
          const profile = Classroom.UserProfiles.get(String(userId));
          avatarUrl = profile.photoUrl || '';
        } catch (error) {
          console.warn(`Avatar tidak dapat diambil untuk user ${userId}: ${error}`);
        }
      }

      students.push({
        userId: String(userId),
        name: String(name),
        email: String(email).trim().toLowerCase(),
        avatarUrl: String(avatarUrl).trim()
      });

    });

    pageToken = response.nextPageToken || null;

  } while (pageToken);

  console.log(`Roster Classroom: ${students.length} student, ${students.filter(student => student.avatarUrl).length} avatar ditemukan`);

  return students;
}


/**
 * ====================================================
 * CLASSROOM - COURSEWORK
 * ====================================================
 */

function getAllCourseWork(courseId) {

  let coursework = [];
  let pageToken = null;

  do {

    const options = {
      pageSize: 100
    };

    if (pageToken) {
      options.pageToken = pageToken;
    }

    const response =
      Classroom.Courses.CourseWork.list(
        courseId,
        options
      );

    const list = response.courseWork || [];

    list.forEach(work => {

      // Semua coursework dihitung, termasuk tugas tanpa maxPoints.
      coursework.push({
        id: String(work.id),
        title: String(work.title || ''),
        maxPoints: work.maxPoints === undefined || work.maxPoints === null
          ? null
          : Number(work.maxPoints)
      });

    });

    pageToken = response.nextPageToken || null;

  } while (pageToken);

  return coursework;
}


/**
 * ====================================================
 * HITUNG NILAI SISWA
 * ====================================================
 *
 * Yang dijumlahkan adalah assignedGrade:
 * nilai yang sudah diberikan guru.
 *
 * Tugas yang belum dinilai tidak dihitung.
 */

function calculateStudentScore(
  courseId,
  userId,
  coursework
) {

  return calculateStudentProgress(courseId, userId, coursework).totalScore;
}

/**
 * Mengambil total poin dan progres coursework seorang siswa.
 * Coursework dianggap selesai bila submission memiliki assignedGrade.
 */
function calculateStudentProgress(
  courseId,
  userId,
  coursework
) {

  let totalScore = 0;
  let missionsCompleted = 0;
  const progress = [];

  coursework.forEach(work => {

    try {

      const response =
        Classroom.Courses.CourseWork.StudentSubmissions.list(
          courseId,
          work.id,
          {
            userId: userId,
            pageSize: 100
          }
        );

      const submissions =
        response.studentSubmissions || [];

      const submission = submissions[0] || {};
      const submitted = submission.state === 'TURNED_IN' || submission.state === 'RETURNED';
      let points = null;

      if (
        submission.assignedGrade !== undefined &&
        submission.assignedGrade !== null &&
        submission.assignedGrade !== ''
      ) {

        const grade =
          Number(submission.assignedGrade);

        if (!isNaN(grade)) {
          totalScore += grade;
          points = grade;
        }

      }

      if (submitted) {
        missionsCompleted++;
      }

      progress.push({
        id: work.id,
        name: work.title || 'Tanpa judul',
        submitted: submitted,
        points: points,
        maxPoints: work.maxPoints
      });

    } catch (error) {

      console.error(
        `Gagal membaca tugas "${work.title}" untuk user ${userId}: ${error}`
      );

    }

  });

  return {
    totalScore: totalScore,
    missionsCompleted: missionsCompleted,
    totalMissions: coursework.length,
    progress: progress
  };
}


/**
 * ====================================================
 * UPDATE DASHBOARD
 * ====================================================
 */

function updateStudentDashboard() {

  const courseId = CONFIG.COURSE_ID;
  const threshold = Number(CONFIG.THRESHOLD);

  const sheet =
    getStudentDashboardSheet();

  const students =
    getAllStudents(courseId);

  const coursework =
    getAllCourseWork(courseId);


  console.log(
    `Jumlah siswa: ${students.length}`
  );

  console.log(
    `Jumlah tugas: ${coursework.length}`
  );


  /*
   * Simpan status lama sebelum data ditulis ulang.
   */
  const existingMap = {};

  if (sheet.getLastRow() > 1) {

    const existingData =
      sheet
        .getRange(
          2,
          1,
          sheet.getLastRow() - 1,
          11
        )
        .getValues();

    existingData.forEach(row => {

      const userId =
        String(row[0] || '').trim();

      if (!userId) {
        return;
      }

      existingMap[userId] = {
        formSent: normalizeYesNo(row[6]),
        formSubmitted: normalizeYesNo(row[7]),
        certificateGenerated: normalizeYesNo(row[8]),
        certificateSent: normalizeYesNo(row[9])
      };

    });

  }


  const rows = [];
  const leaderboardRows = [];

  students.forEach(student => {

    const progress =
      calculateStudentProgress(
        courseId,
        student.userId,
        coursework
      );

    const totalScore = progress.totalScore;

    const eligible =
      totalScore >= threshold;

    const old =
      existingMap[student.userId] || {};


    rows.push([
      student.userId,
      student.name,
      student.email,
      totalScore,
      threshold,
      eligible ? 'YES' : 'NO',
      old.formSent || 'NO',
      old.formSubmitted || 'NO',
      old.certificateGenerated || 'NO',
      old.certificateSent || 'NO',
      new Date()
    ]);

    leaderboardRows.push({
      classroomUserId: student.userId,
      name: student.name,
      email: student.email,
      avatarUrl: student.avatarUrl,
      points: totalScore,
      missionsCompleted: progress.missionsCompleted,
      totalMissions: progress.totalMissions,
      progress: progress.progress
    });

  });


  /*
   * Hapus isi lama, tetapi jangan hapus header.
   */
  if (sheet.getLastRow() > 1) {

    sheet
      .getRange(
        2,
        1,
        sheet.getLastRow() - 1,
        11
      )
      .clearContent();

  }


  /*
   * Tulis data baru.
   */
  if (rows.length > 0) {

    sheet
      .getRange(
        2,
        1,
        rows.length,
        11
      )
      .setValues(rows);

    syncLeaderboardToNextJs(leaderboardRows);

  }


  /*
   * Format.
   */
  if (sheet.getLastRow() > 1) {

    sheet
      .getRange(
        2,
        4,
        sheet.getLastRow() - 1,
        2
      )
      .setNumberFormat('0');

    sheet
      .getRange(
        2,
        11,
        sheet.getLastRow() - 1,
        1
      )
      .setNumberFormat('dd/MM/yyyy HH:mm:ss');

  }


  console.log(
    `Dashboard diperbarui: ${rows.length} siswa`
  );
}


/**
 * ====================================================
 * CLASSROOM CHECK - FUNGSI UTAMA
 * ====================================================
 */

function checkClassroomScores() {

  /*
   * Lock mencegah dua trigger berjalan bersamaan.
   */
  const lock =
    LockService.getScriptLock();

  if (!lock.tryLock(30000)) {

    console.warn(
      'Pengecekan lain sedang berjalan. Proses dibatalkan.'
    );

    return;
  }


  try {

    console.log('=================================');
    console.log('MEMULAI CLASSROOM CHECK');
    console.log('=================================');


    /*
     * Pastikan sheet tersedia.
     */
    setupCertificateSystem();


    /*
     * Update dashboard.
     */
    updateStudentDashboard();


    /*
     * Ambil data terbaru.
     */
    const students =
      getAllStudents(CONFIG.COURSE_ID);

    const coursework =
      getAllCourseWork(CONFIG.COURSE_ID);


    students.forEach(student => {

      try {

        const totalScore =
          calculateStudentScore(
            CONFIG.COURSE_ID,
            student.userId,
            coursework
          );


        console.log(
          `${student.name}: ${totalScore} poin`
        );


        if (
          totalScore >=
          Number(CONFIG.THRESHOLD)
        ) {

          handleEligibleStudent(
            student,
            totalScore
          );

        }

      } catch (error) {

        console.error(
          `Error siswa ${student.name}: ${error}`
        );

      }

    });


    console.log('=================================');
    console.log('CLASSROOM CHECK SELESAI');
    console.log('=================================');

  } finally {

    lock.releaseLock();

  }

}


/**
 * ====================================================
 * HANDLE ELIGIBLE STUDENT
 * ====================================================
 */

function handleEligibleStudent(
  student,
  totalScore
) {

  if (!student.email) {

    console.warn(
      `Email tidak ditemukan untuk ${student.name}`
    );

    return;
  }


  const properties =
    PropertiesService.getScriptProperties();

  const propertyKey =
    `FORM_SENT_${student.userId}`;


  /*
   * Cek property terlebih dahulu.
   */
  const alreadySent =
    properties.getProperty(propertyKey);


  /*
   * Cek juga dashboard.
   * Ini membuat sistem tetap aman jika property hilang
   * tetapi status Sheet masih YES.
   */
  const sheet =
    getStudentDashboardSheet();

  const studentInfo =
    findStudentInDashboard(
      sheet,
      student.userId
    );


  if (
    alreadySent ||
    (
      studentInfo &&
      normalizeYesNo(studentInfo.formSent) === 'YES'
    )
  ) {

    console.log(
      `Form sudah pernah dikirim: ${student.email}`
    );

    /*
     * Sinkronkan property jika hanya Sheet yang YES.
     */
    if (!alreadySent) {

      properties.setProperty(
        propertyKey,
        new Date().toISOString()
      );

    }

    return;
  }


  /*
   * Kirim email.
   */
  sendEligibilityEmail(
    student,
    totalScore
  );


  /*
   * Simpan property setelah email berhasil dikirim.
   */
  properties.setProperty(
    propertyKey,
    new Date().toISOString()
  );


  /*
   * Update dashboard.
   */
  markFormSent(student.userId);


  console.log(
    `Form berhasil dikirim ke ${student.email}`
  );

}


/**
 * ====================================================
 * KIRIM EMAIL ELIGIBILITY
 * ====================================================
 */

function sendEligibilityEmail(
  student,
  totalScore
) {

  const subject =
    '🎉 Kamu telah mencapai 1.000 poin - Ruang PTE';


  const body = `
Halo ${student.name},

Selamat! 🎉

Kamu telah mencapai ${totalScore} poin
di Google Classroom Ruang PTE.

Dengan pencapaian tersebut, kamu berhak mendapatkan
Certificate of Completion dari Ruang PTE.

Silakan isi data sertifikat melalui Google Form berikut:

${CONFIG.FORM_URL}

Pastikan nama yang kamu masukkan sudah benar karena
nama tersebut akan digunakan pada sertifikat.

Terima kasih telah belajar bersama Ruang PTE.

Satu ruang berjuta peluang.

Salam,

Ruang PTE
`;


  MailApp.sendEmail({
    to: student.email,
    subject: subject,
    body: body,
    name: 'Ruang PTE'
  });

}


/**
 * ====================================================
 * MARK FORM SENT
 * ====================================================
 */

function markFormSent(userId) {

  const sheet =
    getStudentDashboardSheet();

  const student =
    findStudentInDashboard(
      sheet,
      userId
    );

  if (!student) {
    return;
  }

  /*
   * Kolom G = Form Sent
   */
  sheet
    .getRange(student.rowIndex, 7)
    .setValue('YES');

}


/**
 * ====================================================
 * FIND STUDENT DI DASHBOARD
 * ====================================================
 */

function findStudentInDashboard(
  sheet,
  userId
) {

  if (sheet.getLastRow() <= 1) {
    return null;
  }

  const data =
    sheet
      .getRange(
        2,
        1,
        sheet.getLastRow() - 1,
        11
      )
      .getValues();


  const target =
    String(userId).trim();


  for (let i = 0; i < data.length; i++) {

    const currentId =
      String(data[i][0] || '').trim();

    if (currentId === target) {

      return {
        rowIndex: i + 2,
        userId: data[i][0],
        name: data[i][1],
        email: data[i][2],
        totalPoint: data[i][3],
        eligible: data[i][5],
        formSent: data[i][6],
        formSubmitted: data[i][7],
        certificateGenerated: data[i][8],
        certificateSent: data[i][9]
      };

    }

  }

  return null;
}


/**
 * ====================================================
 * FORM SUBMIT
 * ====================================================
 *
 * Dipanggil oleh INSTALLABLE TRIGGER:
 *
 * From spreadsheet
 * → On form submit
 */

function onCertificateFormSubmit(e) {

  const lock =
    LockService.getScriptLock();

  if (!lock.tryLock(30000)) {

    throw new Error(
      'Form sedang diproses oleh eksekusi lain.'
    );

  }

  try {

    if (!e) {
      throw new Error(
        'Event object tidak ditemukan. Fungsi ini harus dipanggil oleh trigger On form submit.'
      );
    }


    const ss = getSS();

    const studentsSheet =
      getStudentDashboardSheet();

    const queueSheet =
      getCertificateQueueSheet();


    /*
     * namedValues biasanya tersedia pada
     * spreadsheet form-submit trigger.
     */
    const responses =
      e.namedValues || {};


    const email =
      getFormAnswer(
        responses,
        [
          'Email',
          'Email Address',
          'Alamat Email'
        ]
      )
      .trim()
      .toLowerCase();


    const certificateName =
      getFormAnswer(
        responses,
        [
          'Nama Lengkap untuk Sertifikat',
          'Nama Lengkap (Max 30 character) ',
          'Nama Lengkap',
          'Nama Sertifikat'
        ]
      )
      .trim();


    const program =
      getFormAnswer(
        responses,
        [
          'Program',
          'Program/Kelas',
          'Kelas',
          'Program / Kelas'
        ]
      )
      .trim();


    if (!email) {
      throw new Error(
        'Email kosong atau nama kolom Email pada Google Form tidak cocok.'
      );
    }


    if (!certificateName) {
      throw new Error(
        'Nama sertifikat kosong atau nama pertanyaan tidak cocok.'
      );
    }


    if (!program) {
      throw new Error(
        'Program kosong atau nama pertanyaan tidak cocok.'
      );
    }


    console.log(
      `Form diterima dari: ${email}`
    );


    /*
     * Cari siswa berdasarkan email.
     */
    const studentRow =
      findStudentByEmail(
        studentsSheet,
        email
      );


    /*
     * EMAIL TIDAK TERDAFTAR
     */
    if (!studentRow) {

      notifyAdmin(
        'FORM DITOLAK - EMAIL TIDAK TERDAFTAR',
        `
Email: ${email}
Nama yang diisi: ${certificateName}
Program: ${program}
`
      );

      return;
    }


    /*
     * BELUM ELIGIBLE
     */
    if (
      normalizeYesNo(studentRow.eligible) !==
      'YES'
    ) {

      notifyAdmin(
        'FORM DITOLAK - BELUM ELIGIBLE',
        `
Nama Classroom: ${studentRow.name}
Email: ${email}
Total Poin: ${studentRow.totalPoint}
Threshold: ${CONFIG.THRESHOLD}
`
      );

      return;
    }


    /*
     * CEK DUPLIKAT BERDASARKAN STATUS STUDENTS.
     */
    if (
      normalizeYesNo(studentRow.formSubmitted) ===
      'YES'
    ) {

      notifyAdmin(
        'FORM DUPLIKAT',
        `
Nama: ${studentRow.name}
Email: ${email}
`
      );

      return;
    }


    /*
     * CEK DUPLIKAT DI QUEUE.
     */
    if (
      emailExistsInQueue(
        queueSheet,
        email
      )
    ) {

      /*
       * Sinkronkan status Sheet.
       */
      markFormSubmitted(
        studentRow.userId
      );

      return;
    }


// ==========================================
// MASUK CERTIFICATE QUEUE
// DATA BARU MASUK KE BARIS PERTAMA YANG KOSONG
// SETELAH HEADER, BUKAN KE BARIS PALING BAWAH
// ==========================================

const now = new Date();

// Cari baris pertama yang benar-benar kosong pada kolom B:H.
// Ini penting karena kolom A dapat berisi ARRAYFORMULA sampai
// ribuan baris sehingga sheet.getLastRow() tidak cocok dipakai
// untuk menentukan lokasi data baru.
const firstDataRow = findFirstEmptyQueueRow(queueSheet);

queueSheet
  .getRange(firstDataRow, 2, 1, 7)
  .setValues([[
    email,
    certificateName,
    program,
    now,
    studentRow.userId,
    studentRow.totalPoint,
    'READY'
  ]]);


    /*
     * UPDATE STUDENTS
     */
    markFormSubmitted(
      studentRow.userId
    );


    notifyAdmin(
      'SISWA MASUK CERTIFICATE_QUEUE',
      `
Nama Classroom: ${studentRow.name}
Nama Sertifikat: ${certificateName}
Email: ${email}
Program: ${program}
Total Poin: ${studentRow.totalPoint}
User ID: ${studentRow.userId}
`
    );


  } catch (err) {

    console.error(err);

    notifyAdmin(
      'ERROR FORM VALIDATOR',
      err.stack || err.message
    );

    throw err;

  } finally {

    lock.releaseLock();

  }

}


/**
 * ====================================================
 * FIND STUDENT BY EMAIL
 * ====================================================
 */

function findStudentByEmail(
  sheet,
  email
) {

  if (sheet.getLastRow() <= 1) {
    return null;
  }


  const data =
    sheet
      .getRange(
        2,
        1,
        sheet.getLastRow() - 1,
        11
      )
      .getValues();


  const target =
    String(email)
      .trim()
      .toLowerCase();


  for (let i = 0; i < data.length; i++) {

    const rowEmail =
      String(data[i][2] || '')
        .trim()
        .toLowerCase();


    if (rowEmail === target) {

      return {
        rowIndex: i + 2,
        userId: data[i][0],
        name: data[i][1],
        email: data[i][2],
        totalPoint: data[i][3],
        threshold: data[i][4],
        eligible: data[i][5],
        formSent: data[i][6],
        formSubmitted: data[i][7],
        certificateGenerated: data[i][8],
        certificateSent: data[i][9]
      };

    }

  }

  return null;
}


/**
 * ====================================================
 * MARK FORM SUBMITTED
 * ====================================================
 */

function markFormSubmitted(userId) {

  const sheet =
    getStudentDashboardSheet();

  const student =
    findStudentInDashboard(
      sheet,
      userId
    );

  if (!student) {
    return;
  }

  /*
   * Kolom H = Form Submitted
   */
  sheet
    .getRange(student.rowIndex, 8)
    .setValue('YES');

}


/**
 * ====================================================
 * CARI BARIS PERTAMA YANG KOSONG DI QUEUE
 * ====================================================
 *
 * Data queue berada di kolom B:H.
 * Kolom A boleh berisi ARRAYFORMULA nomor urut.
 * Karena ARRAYFORMULA dapat membuat getLastRow() menunjuk
 * ke baris sangat bawah, kita tidak menggunakan appendRow().
 */
function findFirstEmptyQueueRow(sheet) {

  const startRow = 2;
  const lastSheetRow = Math.max(sheet.getLastRow(), startRow);

  // Ambil data B:H untuk mencari baris pertama yang benar-benar kosong.
  const numRows = Math.max(lastSheetRow - startRow + 1, 1);
  const data = sheet
    .getRange(startRow, 2, numRows, 7)
    .getValues();

  for (let i = 0; i < data.length; i++) {

    const isEmpty = data[i].every(cell =>
      String(cell === null || cell === undefined ? '' : cell).trim() === ''
    );

    if (isEmpty) {
      return startRow + i;
    }
  }

  // Jika seluruh baris yang diperiksa terisi, gunakan baris berikutnya.
  return startRow + data.length;
}


/**
 * ====================================================
 * CEK EMAIL DI QUEUE
 * ====================================================
 */

function emailExistsInQueue(
  sheet,
  email
) {

  if (sheet.getLastRow() <= 1) {
    return false;
  }


  const data =
    sheet
      .getRange(
        2,
        2,
        sheet.getLastRow() - 1,
        1
      )
      .getValues();


  const target =
    String(email)
      .trim()
      .toLowerCase();


  return data.some(row => {

    return String(row[0] || '')
      .trim()
      .toLowerCase() === target;

  });

}


/**
 * ====================================================
 * FORM ANSWER HELPER
 * ====================================================
 *
 * Membuat script lebih toleran terhadap variasi nama
 * pertanyaan Form.
 */

function getFormAnswer(
  namedValues,
  possibleNames
) {

  for (
    let i = 0;
    i < possibleNames.length;
    i++
  ) {

    const key =
      possibleNames[i];

    if (
      Object.prototype.hasOwnProperty.call(
        namedValues,
        key
      )
    ) {

      const value =
        namedValues[key];

      if (
        Array.isArray(value) &&
        value.length > 0
      ) {

        return String(value[0] || '');

      }

      return String(value || '');
    }

  }

  /*
   * Fallback: cari key secara case-insensitive.
   */
  const keys =
    Object.keys(namedValues);


  for (
    let i = 0;
    i < possibleNames.length;
    i++
  ) {

    const wanted =
      possibleNames[i]
        .trim()
        .toLowerCase();


    const matchedKey =
      keys.find(key =>
        String(key)
          .trim()
          .toLowerCase() === wanted
      );


    if (matchedKey) {

      const value =
        namedValues[matchedKey];

      if (
        Array.isArray(value) &&
        value.length > 0
      ) {

        return String(value[0] || '');

      }

      return String(value || '');

    }

  }

  return '';
}


/**
 * ====================================================
 * NORMALIZE YES / NO
 * ====================================================
 */

function normalizeYesNo(value) {

  const text =
    String(value || '')
      .trim()
      .toUpperCase();

  return text === 'YES'
    ? 'YES'
    : 'NO';
}


/**
 * ====================================================
 * ADMIN NOTIFICATION
 * ====================================================
 */

function notifyAdmin(
  subject,
  message
) {

  try {

    MailApp.sendEmail({
      to: CONFIG.ADMIN_EMAIL,
      subject: `[RUANG PTE] ${subject}`,
      body: message
    });

  } catch (error) {

    console.error(
      `Gagal mengirim notifikasi admin: ${error}`
    );

  }

}


/**
 * ====================================================
 * TEST FUNCTIONS
 * ====================================================
 *
 * Fungsi-fungsi di bawah aman dijalankan manual.
 */


/**
 * Tampilkan semua Classroom.
 */
function listMyClassrooms() {

  const response =
    Classroom.Courses.list({
      pageSize: 100
    });

  const courses =
    response.courses || [];


  if (courses.length === 0) {

    console.log(
      'Tidak ada Classroom yang ditemukan.'
    );

    return;
  }


  courses.forEach(course => {

    console.log(
      `Nama: ${course.name} | ID: ${course.id}`
    );

  });

}


/**
 * Tes membaca siswa.
 */
function testStudents() {

  const students =
    getAllStudents(
      CONFIG.COURSE_ID
    );


  console.log(
    `Jumlah siswa: ${students.length}`
  );


  students.forEach(student => {

    console.log(
      `${student.name} | ${student.email} | ${student.userId}`
    );

  });

}


/**
 * Tes membaca coursework.
 */
function testCourseWork() {

  const coursework =
    getAllCourseWork(
      CONFIG.COURSE_ID
    );


  console.log(
    `Jumlah tugas: ${coursework.length}`
  );


  coursework.forEach(work => {

    console.log(
      `${work.title} | Max Points: ${work.maxPoints}`
    );

  });

}


/**
 * Tes perhitungan nilai.
 */
function testScore() {

  const students =
    getAllStudents(
      CONFIG.COURSE_ID
    );

  const coursework =
    getAllCourseWork(
      CONFIG.COURSE_ID
    );


  students.forEach(student => {

    const score =
      calculateStudentScore(
        CONFIG.COURSE_ID,
        student.userId,
        coursework
      );


    console.log(
      `${student.name}: ${score} poin`
    );

  });

}


/**
 * Tes setup sheet.
 */
function testSetup() {

  setupCertificateSystem();

  console.log(
    'STUDENTS dan CERTIFICATE_QUEUE sudah dipastikan tersedia.'
  );

}


/**
 * Tes update dashboard.
 */
function testDashboard() {

  updateStudentDashboard();

  console.log(
    'Dashboard STUDENTS berhasil diperbarui.'
  );

}

/**
 * Merapikan susunan data
 */

function compactCertificateQueue() {

  const sheet =
    getCertificateQueueSheet();

  const lastRow =
    sheet.getLastRow();

  if (lastRow <= 2) {
    console.log('Tidak ada data yang perlu dirapikan.');
    return;
  }

  const headers =
    sheet
      .getRange(1, 1, 1, 8)
      .getValues();

  const data =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        8
      )
      .getValues();

  // Ambil hanya baris yang benar-benar memiliki data
  const nonEmptyRows =
    data.filter(row => {

      return row.some(cell =>
        String(cell || '').trim() !== ''
      );

    });

  // Bersihkan area data
  sheet
    .getRange(
      2,
      1,
      Math.max(lastRow - 1, 1),
      8
    )
    .clearContent();

  // Tulis ulang data mulai dari baris 2
  if (nonEmptyRows.length > 0) {

    sheet
      .getRange(
        2,
        1,
        nonEmptyRows.length,
        8
      )
      .setValues(nonEmptyRows);

  }

  console.log(
    `Queue dirapikan. ${nonEmptyRows.length} data ditemukan.`
  );
}

/**
 * Mengirim roster Classroom langsung ke leaderboard Next.js.
 * Tidak mencocokkan email dengan sheet STUDENTS karena akun Classroom
 * adalah sumber identitas leaderboard.
 */
function syncLeaderboardToNextJs(students) {
  if (!CONFIG.NEXT_API_URL || !CONFIG.NEXT_API_SECRET) {
    console.warn('NEXT_API_URL/NEXT_API_SECRET belum diisi; sync leaderboard dilewati.');
    return;
  }

  // Saat dijalankan manual dari Apps Script, susun payload terlebih dahulu.
  if (!Array.isArray(students)) {
    const classroomStudents = getAllStudents(CONFIG.COURSE_ID);
    const coursework = getAllCourseWork(CONFIG.COURSE_ID);

    students = classroomStudents.map(student => {
      const progress = calculateStudentProgress(
        CONFIG.COURSE_ID,
        student.userId,
        coursework
      );

      return {
        classroomUserId: student.userId,
        name: student.name,
        email: student.email,
        avatarUrl: student.avatarUrl,
        points: progress.totalScore,
        missionsCompleted: progress.missionsCompleted,
        totalMissions: progress.totalMissions,
        progress: progress.progress
      };
    });
  }

  if (students.length === 0) {
    throw new Error(`Tidak ada student ditemukan untuk course ${CONFIG.COURSE_ID}`);
  }

  const response = UrlFetchApp.fetch(CONFIG.NEXT_API_URL, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: `Bearer ${CONFIG.NEXT_API_SECRET}` },
    payload: JSON.stringify({
      courseId: CONFIG.COURSE_ID,
      students: students
    }),
    muteHttpExceptions: true
  });

  const status = response.getResponseCode();
  if (status < 200 || status >= 300) {
    throw new Error(`Sync leaderboard gagal (${status}): ${response.getContentText()}`);
  }

  console.log(`Sync leaderboard berhasil: ${response.getContentText()}`);
}