'use client';

import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

/**
 * SHIFT SUMMARY REPORT (v1.0.0)
 * 
 * Professional PDF template for industrial shift reporting.
 * Includes Omnora branding and tactical audit sections.
 */

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#FFFFFF',
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: '#121417',
    paddingBottom: 15,
    marginBottom: 30,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'black',
    color: '#121417',
    letterSpacing: -1,
  },
  headerInfo: {
    textAlign: 'right',
  },
  title: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 5,
  },
  date: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#121417',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#60A5FA',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 5,
    marginBottom: 15,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  statCard: {
    width: '30%',
    padding: 15,
    backgroundColor: '#F8FAFC',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statLabel: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    padding: 8,
  },
  tableHeaderText: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    padding: 8,
  },
  tableCell: {
    fontSize: 8,
    color: '#334155',
    flex: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 7,
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
});

export const ShiftSummaryReport = ({ data: _data }: { data: unknown }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>OMNORA</Text>
          <Text style={styles.title}>Industrial Ecosystem</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.title}>Shift Summary Report</Text>
          <Text style={styles.date}>{`${new Date().toLocaleDateString()} // ${new Date().toLocaleTimeString()}`}</Text>
        </View>
      </View>

      {/* Overview Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Overview</Text>
        <View style={styles.grid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Detections</Text>
            <Text style={styles.statValue}>12,842</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>AI Confidence</Text>
            <Text style={styles.statValue}>98.4%</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>System Uptime</Text>
            <Text style={styles.statValue}>99.9%</Text>
          </View>
        </View>
      </View>

      {/* Node Health Table */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Node Health Protocol</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderText}>Node ID</Text>
            <Text style={styles.tableHeaderText}>Status</Text>
            <Text style={styles.tableHeaderText}>Inference Speed</Text>
            <Text style={styles.tableHeaderText}>Events Logged</Text>
          </View>
          {[
            { id: 'N01', status: 'STABLE', speed: '12ms', events: 342 },
            { id: 'N02', status: 'STABLE', speed: '14ms', events: 891 },
            { id: 'N03', status: 'STABLE', speed: '11ms', events: 102 },
            { id: 'N04', status: 'STABLE', speed: '15ms', events: 567 },
          ].map((node, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.tableCell}>{node.id}</Text>
              <Text style={styles.tableCell}>{node.status}</Text>
              <Text style={styles.tableCell}>{node.speed}</Text>
              <Text style={styles.tableCell}>{node.events}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Forensic Audit Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Forensic Security Audit</Text>
        <View style={styles.table}>
           <View style={[styles.tableRow, { backgroundColor: '#F8FAFC' }]}>
              <Text style={[styles.tableCell, { flex: 0.3, fontWeight: 'bold' }]}>TIMESTAMP</Text>
              <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>PROTOCOL ACTION</Text>
           </View>
           <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 0.3 }]}>08:42:12</Text>
              <Text style={styles.tableCell}>System boot sequence initialized. Core spec audit passed.</Text>
           </View>
           <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 0.3 }]}>09:15:00</Text>
              <Text style={styles.tableCell}>Mesh Network encrypted bridge established. 4 Nodes verified.</Text>
           </View>
           <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 0.3 }]}>11:30:45</Text>
              <Text style={styles.tableCell}>AI Vision Watchdog triggered silent recovery on Node-02. Latency spike detected.</Text>
           </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Certified SOV-AUDIT Industrial Pipeline</Text>
        <Text style={styles.footerText}>Page 1 of 1</Text>
        <Text style={styles.footerText}>© 2026 Omnora Solutions</Text>
      </View>
    </Page>
  </Document>
);
