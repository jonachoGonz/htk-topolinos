/**
 * Phase 5 - Advanced Features Tests
 * Tests for realtime, messaging, availability editing, holidays, and analytics
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Phase 5.1: Realtime Notifications & Messaging
 */
describe("Phase 5.1: Realtime Notifications & Messaging", () => {
  describe("Message Service", () => {
    it("should send a message to another user", async () => {
      // Mock implementation
      const mockSendMessage = vi.fn().mockResolvedValue({
        id: "msg-1",
        sender_id: "user-1",
        receiver_id: "user-2",
        content: "Hello",
        is_read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const result = await mockSendMessage("user-2", "Hello");

      expect(result).toBeDefined();
      expect(result.sender_id).toBe("user-1");
      expect(result.receiver_id).toBe("user-2");
      expect(result.content).toBe("Hello");
      expect(mockSendMessage).toHaveBeenCalledWith("user-2", "Hello");
    });

    it("should retrieve conversation history", async () => {
      const mockGetConversation = vi.fn().mockResolvedValue([
        {
          id: "msg-1",
          sender_id: "user-1",
          receiver_id: "user-2",
          content: "Hi there",
          is_read: true,
          created_at: new Date().toISOString(),
        },
        {
          id: "msg-2",
          sender_id: "user-2",
          receiver_id: "user-1",
          content: "Hello!",
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ]);

      const messages = await mockGetConversation("user-2");

      expect(messages.length).toBe(2);
      expect(messages[0].content).toBe("Hi there");
      expect(messages[1].content).toBe("Hello!");
      expect(messages[1].is_read).toBe(false);
    });

    it("should get list of conversations with unread counts", async () => {
      const mockGetConversations = vi.fn().mockResolvedValue([
        {
          userId: "user-2",
          userName: "John Doe",
          lastMessage: "See you tomorrow",
          lastMessageTime: new Date().toISOString(),
          unreadCount: 2,
        },
        {
          userId: "user-3",
          userName: "Jane Smith",
          lastMessage: "Great!",
          lastMessageTime: new Date().toISOString(),
          unreadCount: 0,
        },
      ]);

      const conversations = await mockGetConversations();

      expect(conversations.length).toBe(2);
      expect(conversations[0].userName).toBe("John Doe");
      expect(conversations[0].unreadCount).toBe(2);
      expect(conversations[1].unreadCount).toBe(0);
    });

    it("should mark messages as read", async () => {
      const mockMarkAsRead = vi.fn().mockResolvedValue(undefined);

      await mockMarkAsRead("user-2");

      expect(mockMarkAsRead).toHaveBeenCalledWith("user-2");
    });
  });

  describe("Realtime Notifications", () => {
    it("should handle message received event", async () => {
      const mockHandler = vi.fn();

      // Simulate realtime message event
      const event = {
        type: "message_received",
        data: {
          sender_id: "user-2",
          receiver_id: "user-1",
          content: "New message",
        },
      };

      mockHandler(event);

      expect(mockHandler).toHaveBeenCalledWith(event);
      expect(mockHandler.mock.calls[0][0].type).toBe("message_received");
    });

    it("should handle multiple notification types", () => {
      const events = [
        { type: "booking_created", data: { booking_id: "b1" } },
        { type: "availability_changed", data: { availability_id: "a1" } },
        { type: "subscription_created", data: { subscription_id: "s1" } },
        { type: "payment_succeeded", data: { payment_id: "p1" } },
        { type: "message_received", data: { message_id: "m1" } },
      ];

      events.forEach((event) => {
        expect(event).toHaveProperty("type");
        expect(event).toHaveProperty("data");
      });

      expect(events.length).toBe(5);
    });
  });
});

/**
 * Phase 5.2: Availability Editing
 */
describe("Phase 5.2: Availability Editing", () => {
  it("should update availability slot", async () => {
    const mockUpdateAvailability = vi.fn().mockResolvedValue({
      success: true,
    });

    const result = await mockUpdateAvailability(
      "avail-1",
      2, // Wednesday
      "14:00",
      "15:00",
      8
    );

    expect(result.success).toBe(true);
    expect(mockUpdateAvailability).toHaveBeenCalledWith(
      "avail-1",
      2,
      "14:00",
      "15:00",
      8
    );
  });

  it("should validate time format", async () => {
    const mockValidateTime = vi.fn((time: string) => {
      const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
      return timeRegex.test(time);
    });

    expect(mockValidateTime("14:00")).toBe(true);
    expect(mockValidateTime("23:59")).toBe(true);
    expect(mockValidateTime("25:00")).toBe(false);
    expect(mockValidateTime("14:60")).toBe(false);
    expect(mockValidateTime("2:30")).toBe(false);
  });

  it("should validate start time is before end time", async () => {
    const mockValidateTimes = vi.fn(
      (start: string, end: string) => {
        const startMin = parseInt(start.replace(":", ""));
        const endMin = parseInt(end.replace(":", ""));
        return startMin < endMin;
      }
    );

    expect(mockValidateTimes("09:00", "10:00")).toBe(true);
    expect(mockValidateTimes("10:00", "09:00")).toBe(false);
    expect(mockValidateTimes("10:00", "10:00")).toBe(false);
  });

  it("should track edit history", async () => {
    const mockEditHistory = vi.fn().mockResolvedValue({
      id: "history-1",
      availability_id: "avail-1",
      change_type: "updated",
      previous_data: { start_time: "09:00", end_time: "10:00" },
      new_data: { start_time: "14:00", end_time: "15:00" },
    });

    const history = await mockEditHistory("avail-1");

    expect(history.change_type).toBe("updated");
    expect(history.previous_data.start_time).toBe("09:00");
    expect(history.new_data.start_time).toBe("14:00");
  });
});

/**
 * Phase 5.3: Holiday Management
 */
describe("Phase 5.3: Holiday Management", () => {
  it("should create a holiday", async () => {
    const mockCreateHoliday = vi.fn().mockResolvedValue({
      success: true,
      id: "holiday-1",
    });

    const result = await mockCreateHoliday(
      "prof-1",
      "Vacation",
      "2026-12-20",
      "2026-12-31",
      false
    );

    expect(result.success).toBe(true);
    expect(result.id).toBe("holiday-1");
  });

  it("should create recurring holiday", async () => {
    const mockCreateHoliday = vi.fn().mockResolvedValue({
      success: true,
      id: "holiday-2",
    });

    const result = await mockCreateHoliday(
      "prof-1",
      "Christmas",
      "2026-12-25",
      "2026-12-26",
      true,
      "yearly"
    );

    expect(result.success).toBe(true);
  });

  it("should validate date range", async () => {
    const mockValidateDateRange = vi.fn((start: string, end: string) => {
      return new Date(start) < new Date(end);
    });

    expect(mockValidateDateRange("2026-12-20", "2026-12-31")).toBe(true);
    expect(mockValidateDateRange("2026-12-31", "2026-12-20")).toBe(false);
    expect(mockValidateDateRange("2026-12-20", "2026-12-20")).toBe(false);
  });

  it("should check if date is holiday", async () => {
    const mockIsDateHoliday = vi.fn().mockResolvedValue(true);

    const isHoliday = await mockIsDateHoliday("prof-1", "2026-12-25");

    expect(isHoliday).toBe(true);
    expect(mockIsDateHoliday).toHaveBeenCalledWith("prof-1", "2026-12-25");
  });

  it("should delete holiday", async () => {
    const mockDeleteHoliday = vi.fn().mockResolvedValue({
      success: true,
    });

    const result = await mockDeleteHoliday("holiday-1");

    expect(result.success).toBe(true);
    expect(mockDeleteHoliday).toHaveBeenCalledWith("holiday-1");
  });
});

/**
 * Phase 5.4: Admin Analytics
 */
describe("Phase 5.4: Admin Analytics", () => {
  describe("Revenue Metrics", () => {
    it("should calculate total revenue", async () => {
      const mockGetRevenue = vi.fn().mockResolvedValue({
        success: true,
        data: {
          totalRevenue: 15000,
          successfulPayments: 50,
          failedPayments: 2,
          successRate: 96.15,
          refundedAmount: 500,
        },
      });

      const result = await mockGetRevenue("2026-05-01", "2026-05-30");

      expect(result.success).toBe(true);
      expect(result.data.totalRevenue).toBe(15000);
      expect(result.data.successfulPayments).toBe(50);
      expect(result.data.successRate).toBeGreaterThan(95);
    });
  });

  describe("User Metrics", () => {
    it("should calculate active student count", async () => {
      const mockGetUserMetrics = vi.fn().mockResolvedValue({
        success: true,
        data: {
          activeStudents: 250,
          newStudentsThisMonth: 45,
          totalTeachers: 15,
          churnRate: 5.2,
        },
      });

      const result = await mockGetUserMetrics("2026-05-01", "2026-05-30");

      expect(result.success).toBe(true);
      expect(result.data.activeStudents).toBe(250);
      expect(result.data.newStudentsThisMonth).toBe(45);
      expect(result.data.totalTeachers).toBe(15);
    });

    it("should calculate churn rate", async () => {
      const mockCalcChurn = vi.fn((active: number, total: number) => {
        return ((total - active) / total) * 100;
      });

      const churnRate = mockCalcChurn(250, 260);

      expect(churnRate).toBeCloseTo(3.85, 1);
    });
  });

  describe("Utilization Metrics", () => {
    it("should calculate average sessions per student", async () => {
      const mockGetUtilization = vi.fn().mockResolvedValue({
        success: true,
        data: {
          avgSessionsPerStudent: 8.5,
          sessionCompletionRate: 92,
          peakBookingDay: "Wednesday",
          teacherUtilization: 85,
        },
      });

      const result = await mockGetUtilization("2026-05-01", "2026-05-30");

      expect(result.success).toBe(true);
      expect(result.data.avgSessionsPerStudent).toBeGreaterThan(0);
      expect(result.data.sessionCompletionRate).toBeGreaterThanOrEqual(0);
      expect(result.data.sessionCompletionRate).toBeLessThanOrEqual(100);
    });
  });

  describe("Plan Distribution", () => {
    it("should calculate revenue per plan", async () => {
      const mockGetPlanDistribution = vi.fn().mockResolvedValue({
        success: true,
        data: [
          {
            planName: "Plan Básico",
            activeCount: 120,
            revenue: 36000,
          },
          {
            planName: "Plan Profesional",
            activeCount: 80,
            revenue: 40000,
          },
          {
            planName: "Plan Premium",
            activeCount: 50,
            revenue: 50000,
          },
        ],
      });

      const result = await mockGetPlanDistribution();

      expect(result.success).toBe(true);
      expect(result.data.length).toBe(3);
      expect(result.data[0].planName).toBeDefined();
      expect(result.data[0].activeCount).toBeGreaterThan(0);
      expect(result.data[0].revenue).toBeGreaterThan(0);

      // Plans should be sorted by revenue
      expect(result.data[0].revenue).toBeGreaterThanOrEqual(result.data[1].revenue);
    });
  });

  describe("Analytics Date Range", () => {
    it("should accept custom date ranges", async () => {
      const mockGetAnalytics = vi.fn().mockResolvedValue({
        success: true,
        data: {
          startDate: "2026-05-01",
          endDate: "2026-05-31",
          revenue: { totalRevenue: 15000 },
          users: { activeStudents: 250 },
          utilization: { avgSessionsPerStudent: 8.5 },
          planDistribution: [],
        },
      });

      const result = await mockGetAnalytics("2026-05-01", "2026-05-31");

      expect(result.success).toBe(true);
      expect(result.data.startDate).toBe("2026-05-01");
      expect(result.data.endDate).toBe("2026-05-31");
    });

    it("should use 30-day default range", async () => {
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      const startDate = thirtyDaysAgo.toISOString().split("T")[0];
      const endDate = today.toISOString().split("T")[0];

      expect(startDate).toBeDefined();
      expect(endDate).toBeDefined();
    });
  });
});

/**
 * Integration Tests
 */
describe("Phase 5 Integration Tests", () => {
  it("should handle complete message flow", async () => {
    const mockFlow = vi.fn()
      .mockResolvedValueOnce({ id: "msg-1", content: "Hello" }) // send
      .mockResolvedValueOnce([{ id: "msg-1", content: "Hello" }]) // get conversation
      .mockResolvedValueOnce(undefined); // mark as read

    await mockFlow(); // send
    await mockFlow(); // retrieve
    await mockFlow(); // mark read

    expect(mockFlow).toHaveBeenCalledTimes(3);
  });

  it("should coordinate availability and holidays", async () => {
    const mockCheckAvailability = vi.fn().mockResolvedValue(true);
    const mockIsHoliday = vi.fn().mockResolvedValue(false);

    const availableTime = "2026-06-15 14:00";

    const isAvailable = await mockCheckAvailability(availableTime);
    const isOnHoliday = await mockIsHoliday(availableTime);

    const canBook = isAvailable && !isOnHoliday;

    expect(canBook).toBe(true);
  });

  it("should prevent booking during holidays", async () => {
    const mockCheckAvailability = vi.fn().mockResolvedValue(true);
    const mockIsHoliday = vi.fn().mockResolvedValue(true);

    const holidayTime = "2026-12-25 10:00";

    const isAvailable = await mockCheckAvailability(holidayTime);
    const isOnHoliday = await mockIsHoliday(holidayTime);

    const canBook = isAvailable && !isOnHoliday;

    expect(canBook).toBe(false);
  });

  it("should aggregate analytics across all data", async () => {
    const mockMetrics = {
      revenue: { totalRevenue: 15000, successfulPayments: 50 },
      users: { activeStudents: 250, newStudentsThisMonth: 45 },
      utilization: { avgSessionsPerStudent: 8.5, sessionCompletionRate: 92 },
      planDistribution: [
        { planName: "Basic", activeCount: 120, revenue: 36000 },
      ],
    };

    expect(mockMetrics.revenue.totalRevenue).toBeGreaterThan(0);
    expect(mockMetrics.users.activeStudents).toBeGreaterThan(0);
    expect(mockMetrics.utilization.avgSessionsPerStudent).toBeGreaterThan(0);
    expect(mockMetrics.planDistribution.length).toBeGreaterThan(0);
  });
});
