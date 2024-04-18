import * as React from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody'; 
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

function Row(props) {
  const { eventName } = props;
  const [open, setOpen] = React.useState(false);

  return (
    <React.Fragment>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell align="left" style={{ width: '10%' }}>
          {eventName}
        </TableCell>
        <TableCell align="right" style={{ width: '90%' }}>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={() => setOpen(!open)}
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={2}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1 }}>
              <Typography variant="h6" gutterBottom component="div">
                Test Details
              </Typography>
              <Table size="small" aria-label="test details">
                <TableHead>
                  <TableRow>
                    <TableCell>Index</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>API</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell>Payload</TableCell>
                    <TableCell>Expected Response</TableCell>
                    <TableCell>Actual Response</TableCell>
                    <TableCell>Result</TableCell>
                    <TableCell>Status Code</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {/* Render test details here */}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
}

Row.propTypes = {
  eventName: PropTypes.string.isRequired,
};

export default function CollapsibleTable({ eventName }) {
  return (
    <TableContainer component={Paper}>
      <Table aria-label="collapsible table">
        <TableHead>
          <TableRow>
            {/* <TableCell>Event Name</TableCell>
            <TableCell /> */}
          </TableRow>
        </TableHead>
        <TableBody>
          <Row eventName={eventName}/>
        </TableBody>
      </Table>
    </TableContainer>
  );
}
