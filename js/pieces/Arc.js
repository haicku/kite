// Copyright 2002-2012, University of Colorado

/**
 * Draws an arc.
 *
 * @author Jonathan Olson <olsonsjc@gmail.com>
 */

define( function( require ) {
  "use strict";
  
  var assert = require( 'ASSERT/assert' )( 'kite' );
  
  var kite = require( 'KITE/kite' );
  
  var Vector2 = require( 'DOT/Vector2' );
  
  var Piece = require( 'KITE/pieces/Piece' );
  require( 'KITE/pieces/EllipticalArc' );
  require( 'KITE/segments/Line' );
  require( 'KITE/segments/Arc' );
  require( 'KITE/util/Subpath' );
  
  Piece.Arc = function( center, radius, startAngle, endAngle, anticlockwise ) {
    if ( radius < 0 ) {
      // support this case since we might actually need to handle it inside of strokes?
      radius = -radius;
      startAngle += Math.PI;
      endAngle += Math.PI;
    }
    this.center = center;
    this.radius = radius;
    this.startAngle = startAngle;
    this.endAngle = endAngle;
    this.anticlockwise = anticlockwise;
  };
  Piece.Arc.prototype = {
    constructor: Piece.Arc,
    
    writeToContext: function( context ) {
      context.arc( this.center.x, this.center.y, this.radius, this.startAngle, this.endAngle, this.anticlockwise );
    },
    
    // TODO: test various transform types, especially rotations, scaling, shears, etc.
    transformed: function( matrix ) {
      // so we can handle reflections in the transform, we do the general case handling for start/end angles
      var startAngle = matrix.timesVector2( Vector2.createPolar( 1, this.startAngle ) ).minus( matrix.timesVector2( Vector2.ZERO ) ).angle();
      var endAngle = matrix.timesVector2( Vector2.createPolar( 1, this.endAngle ) ).minus( matrix.timesVector2( Vector2.ZERO ) ).angle();
      
      // reverse the 'clockwiseness' if our transform includes a reflection
      var anticlockwise = matrix.getDeterminant() >= 0 ? this.anticlockwise : !this.anticlockwise;

      var scaleVector = matrix.getScaleVector();
      if ( scaleVector.x !== scaleVector.y ) {
        var radiusX = scaleVector.x * this.radius;
        var radiusY = scaleVector.y * this.radius;
        return [new Piece.EllipticalArc( matrix.timesVector2( this.center ), radiusX, radiusY, 0, startAngle, endAngle, anticlockwise )];
      } else {
        var radius = scaleVector.x * this.radius;
        return [new Piece.Arc( matrix.timesVector2( this.center ), radius, startAngle, endAngle, anticlockwise )];
      }
    },
    
    applyPiece: function( shape ) {
      // see http://www.whatwg.org/specs/web-apps/current-work/multipage/the-canvas-element.html#dom-context-2d-arc
      
      var arc = new kite.Segment.Arc( this.center, this.radius, this.startAngle, this.endAngle, this.anticlockwise );
      
      // we are assuming that the normal conditions were already met (or exceptioned out) so that these actually work with canvas
      var startPoint = arc.start;
      var endPoint = arc.end;
      
      // if there is already a point on the subpath, and it is different than our starting point, draw a line between them
      if ( shape.hasSubpaths() && shape.getLastSubpath().getLength() > 0 && !startPoint.equals( shape.getLastSubpath().getLastPoint(), 0 ) ) {
        shape.getLastSubpath().addSegment( new kite.Segment.Line( shape.getLastSubpath().getLastPoint(), startPoint ) );
      }
      
      if ( !shape.hasSubpaths() ) {
        shape.addSubpath( new kite.Subpath() );
      }
      
      shape.getLastSubpath().addSegment( arc );
      
      // technically the Canvas spec says to add the start point, so we do this even though it is probably completely unnecessary (there is no conditional)
      shape.getLastSubpath().addPoint( startPoint );
      shape.getLastSubpath().addPoint( endPoint );
      
      // and update the bounds
      if ( !arc.invalid ) {
        shape.bounds = shape.bounds.union( arc.bounds );
      }
    },
    
    toString: function() {
      return 'arc( ' + this.center.x + ', ' + this.center.y + ', ' + this.radius + ', ' + this.startAngle + ', ' + this.endAngle + ', ' + this.anticlockwise + ' )';
    }
  };
  
  return Piece.Arc;
} );
