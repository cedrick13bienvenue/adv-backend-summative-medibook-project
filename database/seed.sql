USE medibook;

DELETE FROM appointments;
DELETE FROM doctors;
DELETE FROM patients;

INSERT INTO patients (id, full_name, email, phone) VALUES
  (1, 'Ama Mensah',   'ama@mail.com',          '0244-111-222'),
  (2, 'Kojo Owusu',   'kojo@mail.com',         '0555-333-444'),
  (3, 'Efua Asante',  'efua.asante@mail.com',  '0277-555-666'),
  (4, 'Yaw Darko',    'yaw.darko@mail.com',    '0208-777-888'),
  (5, 'Abena Ofori',  'abena.ofori@mail.com',  '0246-999-000'),
  (6, 'Kwame Appiah', 'kwame.appiah@mail.com', '0501-123-456');

INSERT INTO doctors (id, full_name, specialty, consultation_fee, room) VALUES
  (1, 'Dr. Kwabena Boateng', 'Dermatology',      150.00, 'R-12'),
  (2, 'Dr. Akosua Adjei',    'Paediatrics',      100.00, 'R-03'),
  (3, 'Dr. Kofi Ansah',      'Cardiology',       250.00, 'R-07'),
  (4, 'Dr. Esi Quaye',       'General Practice',  80.00, 'R-01');

INSERT INTO appointments
  (appt_ref, patient_id, doctor_id, appt_datetime, amount_paid, status, booked_on, cancelled_at, refund_amount)
VALUES
  ('AP-001', 1, 1, '2026-08-10 09:00:00', 150.00, 'booked',    '2026-07-01 10:15:00', NULL, NULL),
  ('AP-002', 2, 1, '2026-08-10 09:30:00', 120.00, 'booked',    '2026-07-02 14:40:00', NULL, NULL),
  ('AP-003', 1, 2, '2026-08-15 10:00:00', 100.00, 'booked',    '2026-07-03 08:05:00', NULL, NULL),
  ('AP-004', 3, 3, '2026-09-02 11:00:00', 250.00, 'cancelled', '2026-08-20 09:00:00', '2026-08-31 15:00:00', 125.00),
  ('AP-005', 4, 3, '2026-09-02 11:00:00', 250.00, 'booked',    '2026-08-31 16:10:00', NULL, NULL);

SET @near_cap_day  = CURDATE() + INTERVAL 3 DAY;
SET @below_busy    = CURDATE() + INTERVAL 4 DAY;
SET @busy_day      = CURDATE() + INTERVAL 6 DAY;
SET @booked_on     = NOW() - INTERVAL 2 DAY;

SET @earliest      = NOW() + INTERVAL 6 HOUR;
SET @no_refund_slot = CASE
  WHEN TIME(@earliest) <= '09:00:00' THEN TIMESTAMP(DATE(@earliest), '09:00:00')
  WHEN TIME(@earliest) > '16:30:00' THEN TIMESTAMP(DATE(@earliest) + INTERVAL 1 DAY, '09:00:00')
  ELSE TIMESTAMP(DATE(@earliest), SEC_TO_TIME(CEIL(TIME_TO_SEC(TIME(@earliest)) / 1800) * 1800))
END;
SET @half_refund_slot = @no_refund_slot + INTERVAL 1 DAY;

INSERT INTO appointments (appt_ref, patient_id, doctor_id, appt_datetime, amount_paid, booked_on) VALUES
  ('AP-101', 1, 1, TIMESTAMP(@near_cap_day, '09:00:00'), 150.00, @booked_on),
  ('AP-102', 2, 1, TIMESTAMP(@near_cap_day, '09:30:00'), 150.00, @booked_on),
  ('AP-103', 3, 1, TIMESTAMP(@near_cap_day, '10:00:00'), 150.00, @booked_on),
  ('AP-104', 4, 1, TIMESTAMP(@near_cap_day, '10:30:00'), 150.00, @booked_on),
  ('AP-105', 5, 1, TIMESTAMP(@near_cap_day, '11:00:00'), 150.00, @booked_on),
  ('AP-106', 6, 1, TIMESTAMP(@near_cap_day, '11:30:00'), 150.00, @booked_on),
  ('AP-107', 1, 1, TIMESTAMP(@near_cap_day, '12:00:00'), 150.00, @booked_on),
  ('AP-108', 2, 1, TIMESTAMP(@near_cap_day, '12:30:00'), 150.00, @booked_on),
  ('AP-109', 3, 1, TIMESTAMP(@near_cap_day, '13:00:00'), 150.00, @booked_on),
  ('AP-110', 4, 1, TIMESTAMP(@near_cap_day, '13:30:00'), 150.00, @booked_on),
  ('AP-111', 5, 1, TIMESTAMP(@near_cap_day, '14:00:00'), 150.00, @booked_on),

  ('AP-201', 6, 3, TIMESTAMP(@busy_day, '09:00:00'), 250.00, @booked_on),
  ('AP-202', 5, 3, TIMESTAMP(@busy_day, '09:30:00'), 250.00, @booked_on),
  ('AP-203', 4, 3, TIMESTAMP(@busy_day, '10:00:00'), 250.00, @booked_on),
  ('AP-204', 3, 3, TIMESTAMP(@busy_day, '10:30:00'), 250.00, @booked_on),
  ('AP-205', 2, 3, TIMESTAMP(@busy_day, '11:00:00'), 250.00, @booked_on),
  ('AP-206', 1, 3, TIMESTAMP(@busy_day, '11:30:00'), 250.00, @booked_on),
  ('AP-207', 6, 3, TIMESTAMP(@busy_day, '13:00:00'), 250.00, @booked_on),
  ('AP-208', 5, 3, TIMESTAMP(@busy_day, '13:30:00'), 250.00, @booked_on),
  ('AP-209', 4, 3, TIMESTAMP(@busy_day, '14:00:00'), 250.00, @booked_on),
  ('AP-210', 3, 3, TIMESTAMP(@busy_day, '14:30:00'), 250.00, @booked_on),

  ('AP-301', 1, 2, TIMESTAMP(@below_busy, '09:00:00'), 100.00, @booked_on),
  ('AP-302', 2, 2, TIMESTAMP(@below_busy, '09:30:00'), 100.00, @booked_on),
  ('AP-303', 3, 2, TIMESTAMP(@below_busy, '10:00:00'), 100.00, @booked_on),
  ('AP-304', 4, 2, TIMESTAMP(@below_busy, '10:30:00'), 100.00, @booked_on),
  ('AP-305', 5, 2, TIMESTAMP(@below_busy, '11:00:00'), 100.00, @booked_on),
  ('AP-306', 6, 2, TIMESTAMP(@below_busy, '11:30:00'), 100.00, @booked_on),
  ('AP-307', 1, 2, TIMESTAMP(@below_busy, '14:00:00'), 100.00, @booked_on),
  ('AP-308', 2, 2, TIMESTAMP(@below_busy, '14:30:00'), 100.00, @booked_on),
  ('AP-309', 3, 2, TIMESTAMP(@below_busy, '15:00:00'), 100.00, @booked_on),

  ('AP-401', 5, 2, @no_refund_slot,   100.00, @booked_on),
  ('AP-402', 6, 3, @half_refund_slot, 250.00, @booked_on);
