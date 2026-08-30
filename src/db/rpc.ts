import "@tanstack/react-start/server-only";
import { getPool } from "./index";

export async function incrementRateLimit(input: {
  p_action_key: string;
  p_identifier: string;
  p_window_start?: string;
}) {
  const pool = getPool();
  await pool.execute(
    `INSERT INTO rate_limits (action_key, identifier, window_start, attempt_count)
     VALUES (?, ?, COALESCE(?, CURRENT_TIMESTAMP), 1)
     ON DUPLICATE KEY UPDATE attempt_count = attempt_count + 1`,
    [input.p_action_key, input.p_identifier, input.p_window_start ?? null],
  );
  return true;
}

export async function generateEventSeats(input: {
  p_event_id: string;
  p_section_id: string;
  p_row_label: string;
  p_start_number?: number;
  p_end_number?: number;
}) {
  const start = Number(input.p_start_number ?? 1);
  const end = Number(input.p_end_number ?? start);
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const [sectionRows] = await conn.execute(
      "SELECT section_code, seat_type FROM event_seat_sections WHERE id = ? AND event_id = ? FOR UPDATE",
      [input.p_section_id, input.p_event_id],
    );
    const section = (sectionRows as any[])[0];
    if (!section) throw new Error("Seat section not found.");
    let created = 0;
    for (let seatNumber = start; seatNumber <= end; seatNumber++) {
      const seatLabel = `${section.section_code}-${input.p_row_label}${seatNumber}`;
      await conn.execute(
        `INSERT IGNORE INTO event_seats
         (event_id, section_id, row_label, seat_number, seat_label, seat_type, display_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [input.p_event_id, input.p_section_id, input.p_row_label, seatNumber, seatLabel, section.seat_type, seatNumber],
      );
      created++;
    }
    await conn.commit();
    return { created };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function allocateRegistrationSeats(input: {
  p_registration_id: string;
  p_changed_by?: string;
}) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const [regRows] = await conn.execute(
      "SELECT id, event_id, registration_type, full_name FROM registrations WHERE id = ? FOR UPDATE",
      [input.p_registration_id],
    );
    const reg = (regRows as any[])[0];
    if (!reg?.event_id) throw new Error("Registration not found.");

    const [passRows] = await conn.execute(
      "SELECT id, pass_type, guest_id FROM passes WHERE registration_id = ? AND status <> 'revoked' ORDER BY created_at FOR UPDATE",
      [reg.id],
    );
    const passes = passRows as any[];
    const allocated: any[] = [];

    for (const pass of passes) {
      const holderType = pass.pass_type || reg.registration_type;
      const [existingRows] = await conn.execute(
        "SELECT id FROM seat_bookings WHERE registration_id = ? AND pass_id = ? FOR UPDATE",
        [reg.id, pass.id],
      );
      if ((existingRows as any[]).length) continue;

      const [seatRows] = await conn.execute(
        `SELECT id, seat_label, row_label, seat_number
         FROM event_seats
         WHERE event_id = ? AND status = 'available'
         ORDER BY display_order, row_label, seat_number
         LIMIT 1 FOR UPDATE`,
        [reg.event_id],
      );
      const seat = (seatRows as any[])[0];
      if (!seat) throw new Error("No available seats for this event.");

      const holderName = await holderNameForPass(conn, pass, reg.full_name);
      await conn.execute("UPDATE event_seats SET status = 'booked' WHERE id = ?", [seat.id]);
      await conn.execute(
        `INSERT INTO seat_bookings (event_id, seat_id, registration_id, pass_id, holder_type, holder_name)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [reg.event_id, seat.id, reg.id, pass.id, holderType, holderName],
      );
      await conn.execute(
        `UPDATE passes
         SET seat_label = ?, seat_row_label = ?, seat_number = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [seat.seat_label, seat.row_label, seat.seat_number, pass.id],
      );
      await conn.execute(
        `INSERT INTO seat_allocation_audit
         (event_id, registration_id, pass_id, new_seat_id, action, changed_by, reason)
         VALUES (?, ?, ?, ?, 'allocate', ?, 'payment verified')`,
        [reg.event_id, reg.id, pass.id, seat.id, input.p_changed_by ?? "system"],
      );
      allocated.push({ pass_id: pass.id, seat_id: seat.id, seat_label: seat.seat_label });
    }

    await conn.execute(
      "UPDATE registrations SET seat_allocation_status = 'allocated', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [reg.id],
    );
    await conn.commit();
    return allocated;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function holderNameForPass(conn: any, pass: any, fallback: string) {
  if (!pass.guest_id) return fallback;
  const [rows] = await conn.execute("SELECT full_name FROM guests WHERE id = ? LIMIT 1", [pass.guest_id]);
  return (rows as any[])[0]?.full_name ?? fallback;
}

export async function callRpc(name: string, args: Record<string, any>) {
  if (name === "increment_rate_limit") return incrementRateLimit(args as any);
  if (name === "generate_event_seats") return generateEventSeats(args as any);
  if (name === "allocate_registration_seats") return allocateRegistrationSeats(args as any);
  throw new Error(`Unknown RPC function: ${name}`);
}
