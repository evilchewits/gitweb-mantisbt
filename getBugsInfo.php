<?php

require_once( __DIR__ . '/../../../core.php' );

if ( isset( $_REQUEST['bugs'] ) && preg_match( "/^[0-9]+$/D", $_REQUEST['bugs'] ) && strlen( $_REQUEST['bugs'] ) % 7 == 0 ) {
	getBugsInfoJSONPResponse( $_REQUEST['bugs'] );
}

function getBugsInfoJSONPResponse( $bugsString ) {
	$t_bug_table = db_get_table( 'mantis_bug_table' );

	$t_statuses = MantisEnum::getAssocArrayIndexedByValues( config_get( 'status_enum_string' ) );
	$statuses = '';

	foreach ( $t_statuses as $t_state => $t_label )
	{
		$statuses .= '"' . $t_label . '": "' . get_status_color( $t_state ) . '", ';
	}

	$bugs_list = array_unique( str_split( $bugsString, 7 ) );
	$bugs_list = "'" . implode( "', '", $bugs_list ) . "'";

	$query = "SELECT id, status, summary
			  FROM `".$t_bug_table."`
			  WHERE id IN (" . $bugs_list . ")
			  ORDER BY FIELD(id, " . $bugs_list . ")";
	$results = db_query_bound( $query );

	if ($results) {
		$json = '';

		while ( $row = db_fetch_array( $results ) ) {
			$id             = $row['id'];
			$statusId       = $row['status'];
			$summary        = $row['summary'];
			$json          .= '"' . $id . '": { "status": "' . $t_statuses[$statusId] . '", "summary": "' . htmlspecialchars( $summary ) . '" }, ';
		}
	}

	header( "Content-Type: application/javascript; charset=utf-8" );

	echo 'bugtrackerConnection_callback( { "offset": "' . $_REQUEST['offset'] . '", "length": "' . $_REQUEST['length'] . '", "statuses": { ' . substr($statuses, 0, -2) . ' }, "bugsInfo" : { ' . substr($json, 0, -2) . ' } } );';
}
