package com.runestone.treasury.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.runestone.treasury.dto.request.MakerCheckerWireRequestDto;
import com.runestone.treasury.entity.JournalEntry;
import com.runestone.treasury.entity.MakerCheckerWire;
import com.runestone.treasury.exception.SeparationOfDutiesViolationException;
import com.runestone.treasury.repository.MakerCheckerWireRepository;
import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class MakerCheckerWireServiceTests {

  @Mock private MakerCheckerWireRepository makerCheckerWireRepository;

  @Mock private JournalEntryService journalEntryService;

  @Mock private ComplianceAuditLogService complianceAuditLogService;

  @InjectMocks private MakerCheckerWireService makerCheckerWireService;

  @BeforeEach
  void setUp() {
    when(makerCheckerWireRepository.save(any(MakerCheckerWire.class)))
        .thenAnswer(
            inv -> {
              MakerCheckerWire w = inv.getArgument(0);
              if (w.getId() == null) w.setId(88L);
              return w;
            });
  }

  @Test
  void testSubmitWire_Tier1Auto() {
    MakerCheckerWireRequestDto dto =
        new MakerCheckerWireRequestDto(
            "WIRE-T1", 1L, 2L, new BigDecimal("450.00"), "USD", "Office Supplies");

    MakerCheckerWire wire = makerCheckerWireService.submitWire(dto, "alice");

    assertNotNull(wire);
    assertEquals("TIER_1_AUTO", wire.getPolicyTier());
    assertEquals(0, wire.getRequiredApprovals());
    assertEquals("SETTLED", wire.getStatus());
    verify(journalEntryService).saveEntry(any(JournalEntry.class), eq("alice"), eq(false), any());
  }

  @Test
  void testSubmitWire_Tier2SingleChecker() {
    MakerCheckerWireRequestDto dto =
        new MakerCheckerWireRequestDto(
            "WIRE-T2", 1L, 2L, new BigDecimal("5500.00"), "USD", "Server Infrastructure");

    MakerCheckerWire wire = makerCheckerWireService.submitWire(dto, "alice");

    assertNotNull(wire);
    assertEquals("TIER_2_SINGLE_CHECKER", wire.getPolicyTier());
    assertEquals(1, wire.getRequiredApprovals());
    assertEquals("PENDING_APPROVAL", wire.getStatus());
    verify(journalEntryService, never()).saveEntry(any(), any(), eq(false), any());
  }

  @Test
  void testSubmitWire_Tier3DualChecker() {
    MakerCheckerWireRequestDto dto =
        new MakerCheckerWireRequestDto(
            "WIRE-T3", 1L, 2L, new BigDecimal("45000.00"), "USD", "Acquisition Wire");

    MakerCheckerWire wire = makerCheckerWireService.submitWire(dto, "alice");

    assertNotNull(wire);
    assertEquals("TIER_3_DUAL_CHECKER", wire.getPolicyTier());
    assertEquals(2, wire.getRequiredApprovals());
    assertEquals("PENDING_APPROVAL", wire.getStatus());
  }

  @Test
  void testApproveWire_SelfApprovalForbidden() {
    MakerCheckerWire wire = new MakerCheckerWire();
    wire.setId(88L);
    wire.setMakerUserName("alice");
    wire.setStatus("PENDING_APPROVAL");
    wire.setRequiredApprovals(1);

    when(makerCheckerWireRepository.findById(88L)).thenReturn(Optional.of(wire));

    assertThrows(
        SeparationOfDutiesViolationException.class,
        () -> makerCheckerWireService.approveWire(88L, "alice", "Trying to approve own wire"));
  }

  @Test
